import { Router } from 'express';
import { query } from '../db.js';
import { parseLimit, sortClause } from '../utils.js';

const router = Router();

const COLS = `id, product_id, product_name, sku,
              quantity,
              unit_price::float8 AS unit_price,
              total_amount::float8 AS total_amount,
              to_char(sale_date, 'YYYY-MM-DD') AS sale_date,
              source, created_date, updated_date`;

router.get('/', async (req, res) => {
  const sort = sortClause(req.query.sort) || ' ORDER BY sale_date DESC, created_date DESC';
  const limit = parseLimit(req.query.limit);
  const { rows } = await query(`SELECT ${COLS} FROM sales_entries${sort} LIMIT $1`, [limit]);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query(`SELECT ${COLS} FROM sales_entries WHERE id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `INSERT INTO sales_entries
       (product_id, product_name, sku, quantity, unit_price, total_amount, sale_date, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLS}`,
    [
      b.product_id,
      b.product_name,
      b.sku,
      Number(b.quantity) || 0,
      Number(b.unit_price) || 0,
      Number(b.total_amount) || (Number(b.unit_price) * Number(b.quantity)) || 0,
      b.sale_date || new Date().toISOString().slice(0, 10),
      b.source || 'manual'
    ]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM sales_entries WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
