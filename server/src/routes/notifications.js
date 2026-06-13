import { Router } from 'express';
import { query } from '../db.js';
import { parseLimit, sortClause } from '../utils.js';

const router = Router();

const COLS = `id, type, severity, title, message, product_id, read, created_date, updated_date`;

router.get('/', async (req, res) => {
  const sort = sortClause(req.query.sort) || ' ORDER BY created_date DESC';
  const limit = parseLimit(req.query.limit, 100);
  const { rows } = await query(`SELECT ${COLS} FROM notifications${sort} LIMIT $1`, [limit]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `INSERT INTO notifications (type, severity, title, message, product_id, read)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, FALSE))
     RETURNING ${COLS}`,
    [b.type, b.severity, b.title, b.message, b.product_id || null, b.read]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const b = req.body || {};
  const updates = [];
  const params = [];
  let i = 1;
  if (b.read !== undefined) { updates.push(`read = $${i++}`); params.push(!!b.read); }
  if (updates.length === 0) {
    const cur = await query(`SELECT ${COLS} FROM notifications WHERE id = $1`, [req.params.id]);
    return res.json(cur.rows[0] || null);
  }
  updates.push(`updated_date = now()`);
  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE notifications SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${COLS}`,
    params
  );
  res.json(rows[0] || null);
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
