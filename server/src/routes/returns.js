import { Router } from 'express';
import { query, tx } from '../db.js';
import { parseLimit, sortClause } from '../utils.js';

const router = Router();

const COLS = `id, product_id, product_name, sku, quantity, channel, reason,
              to_char(return_date, 'YYYY-MM-DD') AS return_date,
              created_date, updated_date`;

/** GET /api/returns */
router.get('/', async (req, res) => {
  try {
    const sort = sortClause(req.query.sort) || ' ORDER BY return_date DESC, created_date DESC';
    const limit = parseLimit(req.query.limit);
    const { rows } = await query(`SELECT ${COLS} FROM return_entries${sort} LIMIT $1`, [limit]);
    res.json(rows);
  } catch (err) {
    console.error('returns GET error', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/returns/:id
 * Reverses a return: removes the row and subtracts the returned quantity
 * back out of stock (undoing the stock that the return had added).
 */
router.delete('/:id', async (req, res) => {
  try {
    await tx(async (client) => {
      const { rows: [ret] } = await client.query(
        'SELECT product_id, quantity FROM return_entries WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );
      if (!ret) throw new Error('Return not found');

      if (ret.product_id) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1, updated_date = now() WHERE id = $2',
          [ret.quantity, ret.product_id]
        );
      }
      await client.query('DELETE FROM return_entries WHERE id = $1', [req.params.id]);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
