import { Router } from 'express';
import { query, tx } from '../db.js';
import { sendStockAlertEmail } from '../mailer.js';
import { getAlertEmail } from './settings.js';

const router = Router();

const PROD_COLS = `id, name, sku, category,
                   price::float8 AS price,
                   stock_quantity, initial_stock, low_stock_threshold,
                   created_date, updated_date`;

const SALES_COLS = `id, product_id, product_name, sku, quantity,
                    unit_price::float8 AS unit_price,
                    total_amount::float8 AS total_amount,
                    to_char(sale_date, 'YYYY-MM-DD') AS sale_date,
                    source, created_date, updated_date`;

/**
 * POST /api/utils/record-sales
 * Body: { entries: [{ product_id, quantity, unit_price? }], sale_date?, source? }
 *
 * Atomically inserts sales rows AND deducts stock. Auto-creates notifications
 * when stock falls to/below threshold or goes negative.
 */
router.post('/record-sales', async (req, res) => {
  const { entries, sale_date, source } = req.body || {};
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries[] required' });
  }
  const date = sale_date || new Date().toISOString().slice(0, 10);
  const src = source || 'manual';

  try {
    const result = await tx(async (client) => {
      const created = [];
      const notified = [];
      const alerts = [];

      for (const e of entries) {
        if (!e.product_id) continue;
        const qty = Math.max(1, Number(e.quantity) || 0);

        // Lock the product row, get current stock + price
        const { rows: [product] } = await client.query(
          `SELECT id, name, sku, price::float8 AS price, stock_quantity, low_stock_threshold
             FROM products WHERE id = $1 FOR UPDATE`,
          [e.product_id]
        );
        if (!product) continue;

        const unitPrice = Number(e.unit_price ?? product.price);
        const newStock = product.stock_quantity - qty;

        const { rows: [sale] } = await client.query(
          `INSERT INTO sales_entries
             (product_id, product_name, sku, quantity, unit_price, total_amount, sale_date, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING ${SALES_COLS}`,
          [product.id, product.name, product.sku, qty, unitPrice, qty * unitPrice, date, src]
        );
        created.push(sale);

        await client.query(
          `UPDATE products SET stock_quantity = $1, updated_date = now() WHERE id = $2`,
          [newStock, product.id]
        );

        // Notifications
        if (newStock < 0) {
          const alert = {
            type: 'mismatch',
            severity: 'critical',
            title: 'Stock mismatch',
            message: `${product.name} sold beyond available stock (now ${newStock}). Possible loss.`,
            product_name: product.name
          };
          const { rows: [n] } = await client.query(
            `INSERT INTO notifications (type, severity, title, message, product_id, read)
             VALUES ('mismatch', 'critical', 'Stock mismatch',
                     $1, $2, FALSE) RETURNING id`,
            [alert.message, product.id]
          );
          notified.push(n.id);
          alerts.push(alert);
        } else if (newStock <= (product.low_stock_threshold || 10)) {
          const alert = {
            type: 'low_stock',
            severity: newStock === 0 ? 'critical' : 'warning',
            title: newStock === 0 ? 'Out of stock' : 'Low stock',
            message: `${product.name} is at ${newStock} units (threshold ${product.low_stock_threshold || 10}).`,
            product_name: product.name
          };
          const { rows: [n] } = await client.query(
            `INSERT INTO notifications (type, severity, title, message, product_id, read)
             VALUES ('low_stock', $1, $2, $3, $4, FALSE) RETURNING id`,
            [alert.severity, alert.title, alert.message, product.id]
          );
          notified.push(n.id);
          alerts.push(alert);
        }
      }

      return { created, notified, alerts };
    });

    // Fire off the alert email after the transaction commits. Awaited but
    // never throws — a mail failure must not fail the sale-recording request.
    if (result.alerts.length > 0) {
      const recipient = (await getAlertEmail()) || req.user?.email;
      if (recipient) await sendStockAlertEmail(recipient, result.alerts);
    }

    res.json({ created: result.created, notified: result.notified });
  } catch (err) {
    console.error('record-sales error', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/utils/record-returns
 * Body: { entries: [{ product_id, quantity, reason? }], return_date?, channel? }
 *
 * Atomically inserts return rows AND adds the quantity back to product stock.
 * Returns are tracked per channel (website/noon/amazon/walk-in) and kept
 * separate from sales, so they never reduce sales revenue.
 */
router.post('/record-returns', async (req, res) => {
  const { entries, return_date, channel } = req.body || {};
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries[] required' });
  }
  const date = return_date || new Date().toISOString().slice(0, 10);
  const ch = channel || 'website';

  try {
    const result = await tx(async (client) => {
      const created = [];

      for (const e of entries) {
        if (!e.product_id) continue;
        const qty = Math.max(1, Number(e.quantity) || 0);

        const { rows: [product] } = await client.query(
          `SELECT id, name, sku FROM products WHERE id = $1 FOR UPDATE`,
          [e.product_id]
        );
        if (!product) continue;

        const { rows: [ret] } = await client.query(
          `INSERT INTO return_entries
             (product_id, product_name, sku, quantity, channel, reason, return_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, product_id, product_name, sku, quantity, channel, reason,
                     to_char(return_date, 'YYYY-MM-DD') AS return_date, created_date, updated_date`,
          [product.id, product.name, product.sku, qty, ch, e.reason || null, date]
        );
        created.push(ret);

        await client.query(
          `UPDATE products SET stock_quantity = stock_quantity + $1, updated_date = now() WHERE id = $2`,
          [qty, product.id]
        );
      }

      return { created };
    });

    res.json(result);
  } catch (err) {
    console.error('record-returns error', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/utils/restock
 * Body: { product_id, quantity }
 */
router.post('/restock', async (req, res) => {
  const { product_id, quantity } = req.body || {};
  const qty = Number(quantity) || 0;
  if (!product_id || qty <= 0) {
    return res.status(400).json({ error: 'product_id and positive quantity required' });
  }
  const { rows } = await query(
    `UPDATE products
        SET stock_quantity = stock_quantity + $1,
            initial_stock = initial_stock + $1,
            updated_date = now()
      WHERE id = $2
      RETURNING ${PROD_COLS}`,
    [qty, product_id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

/**
 * POST /api/utils/reverse-sale
 * Body: { sale_id }
 * Removes a sale and adds its quantity back to product stock.
 */
router.post('/reverse-sale', async (req, res) => {
  const { sale_id } = req.body || {};
  if (!sale_id) return res.status(400).json({ error: 'sale_id required' });

  try {
    await tx(async (client) => {
      const { rows: [sale] } = await client.query(
        'SELECT product_id, quantity FROM sales_entries WHERE id = $1 FOR UPDATE',
        [sale_id]
      );
      if (!sale) throw new Error('Sale not found');

      if (sale.product_id) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1, updated_date = now() WHERE id = $2',
          [sale.quantity, sale.product_id]
        );
      }
      await client.query('DELETE FROM sales_entries WHERE id = $1', [sale_id]);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
