import { Router } from 'express';
import { query } from '../db.js';
import { parseLimit, sortClause } from '../utils.js';

const router = Router();

const COLS = `id, name, sku, category,
              price::float8 AS price,
              stock_quantity, initial_stock, low_stock_threshold,
              created_date, updated_date`;

router.get('/', async (req, res) => {
  const sort = sortClause(req.query.sort) || ' ORDER BY created_date DESC';
  const limit = parseLimit(req.query.limit);
  const { rows } = await query(`SELECT ${COLS} FROM products${sort} LIMIT $1`, [limit]);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query(`SELECT ${COLS} FROM products WHERE id = $1`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.sku) return res.status(400).json({ error: 'name and sku required' });

  const { rows } = await query(
    `INSERT INTO products (name, sku, category, price, stock_quantity, initial_stock, low_stock_threshold)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      b.name,
      b.sku,
      b.category || 'Uncategorized',
      Number(b.price) || 0,
      Number(b.stock_quantity) || 0,
      Number(b.initial_stock ?? b.stock_quantity) || 0,
      Number(b.low_stock_threshold) || 10
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const b = req.body || {};
  const updates = [];
  const params = [];
  let i = 1;
  const map = {
    name: b.name,
    sku: b.sku,
    category: b.category,
    price: b.price !== undefined ? Number(b.price) : undefined,
    stock_quantity: b.stock_quantity !== undefined ? Number(b.stock_quantity) : undefined,
    initial_stock: b.initial_stock !== undefined ? Number(b.initial_stock) : undefined,
    low_stock_threshold: b.low_stock_threshold !== undefined ? Number(b.low_stock_threshold) : undefined
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) {
      updates.push(`${k} = $${i++}`);
      params.push(v);
    }
  }
  if (updates.length === 0) {
    const cur = await query(`SELECT ${COLS} FROM products WHERE id = $1`, [req.params.id]);
    return res.json(cur.rows[0] || null);
  }
  updates.push(`updated_date = now()`);
  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE products SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${COLS}`,
    params
  );
  res.json(rows[0] || null);
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
