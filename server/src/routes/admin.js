import { Router } from 'express';
import { pool, query, tx } from '../db.js';
import { runSeed } from '../seed.js';

const router = Router();

/**
 * GET /api/admin/export
 * Returns all entities as a single JSON object for backup.
 */
router.get('/export', async (req, res) => {
  const [products, sales, notifications] = await Promise.all([
    query('SELECT * FROM products ORDER BY created_date'),
    query('SELECT id, product_id, product_name, sku, quantity, unit_price, total_amount, to_char(sale_date, \'YYYY-MM-DD\') AS sale_date, source, created_date, updated_date FROM sales_entries ORDER BY created_date'),
    query('SELECT * FROM notifications ORDER BY created_date')
  ]);
  res.json({
    exported_at: new Date().toISOString(),
    products: products.rows,
    sales_entries: sales.rows,
    notifications: notifications.rows
  });
});

/**
 * POST /api/admin/import
 * Body: { products?: [], sales_entries?: [], notifications?: [] }
 * Replaces all data with the import payload (transactional).
 */
router.post('/import', async (req, res) => {
  const data = req.body || {};
  try {
    await tx(async (client) => {
      await client.query('TRUNCATE notifications, sales_entries, products RESTART IDENTITY CASCADE');

      for (const p of data.products || []) {
        await client.query(
          `INSERT INTO products
             (id, name, sku, category, price, stock_quantity, initial_stock, low_stock_threshold, created_date, updated_date)
           VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8,
                   COALESCE($9::timestamptz, now()), COALESCE($10::timestamptz, now()))`,
          [
            p.id, p.name, p.sku, p.category, p.price,
            p.stock_quantity, p.initial_stock, p.low_stock_threshold,
            p.created_date, p.updated_date
          ]
        );
      }

      for (const s of data.sales_entries || []) {
        await client.query(
          `INSERT INTO sales_entries
             (id, product_id, product_name, sku, quantity, unit_price, total_amount, sale_date, source, created_date, updated_date)
           VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9,
                   COALESCE($10::timestamptz, now()), COALESCE($11::timestamptz, now()))`,
          [
            s.id, s.product_id, s.product_name, s.sku, s.quantity,
            s.unit_price, s.total_amount, s.sale_date, s.source || 'manual',
            s.created_date, s.updated_date
          ]
        );
      }

      for (const n of data.notifications || []) {
        await client.query(
          `INSERT INTO notifications
             (id, type, severity, title, message, product_id, read, created_date, updated_date)
           VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7,
                   COALESCE($8::timestamptz, now()), COALESCE($9::timestamptz, now()))`,
          [
            n.id, n.type, n.severity, n.title, n.message, n.product_id, !!n.read,
            n.created_date, n.updated_date
          ]
        );
      }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('import error', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/wipe', async (req, res) => {
  await pool.query('TRUNCATE notifications, sales_entries, products RESTART IDENTITY CASCADE');
  res.json({ ok: true });
});

router.post('/reset-demo', async (req, res) => {
  try {
    await tx(async (client) => {
      await client.query('TRUNCATE notifications, sales_entries, products RESTART IDENTITY CASCADE');
    });
    await runSeed();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
