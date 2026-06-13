import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import {
  clearSessionCookie, readSession, requireAuth, setSessionCookie, signSession
} from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password required' });
  }

  const { rows } = await query(
    'SELECT id, email, password_hash, name, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email.trim()]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ ok: false, error: 'Invalid email or password' });

  const token = signSession(user);
  setSessionCookie(res, token);

  res.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const session = readSession(req);
  if (!session) return res.json(null);
  res.json({
    id: session.sub,
    email: session.email,
    name: session.name,
    role: session.role
  });
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name, email, password } = req.body || {};
  const updates = [];
  const params = [];
  let i = 1;

  if (name !== undefined) { updates.push(`name = $${i++}`); params.push(name); }
  if (email !== undefined) { updates.push(`email = $${i++}`); params.push(email); }
  if (password !== undefined && password.length > 0) {
    const hash = await bcrypt.hash(password, 10);
    updates.push(`password_hash = $${i++}`);
    params.push(hash);
  }

  if (updates.length === 0) {
    return res.json({ ok: true });
  }

  updates.push(`updated_date = now()`);
  params.push(req.user.sub);
  const { rows } = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, name, role`,
    params
  );
  const user = rows[0];

  // Refresh cookie with updated session info
  setSessionCookie(res, signSession(user));
  res.json({ ok: true, user });
});

export default router;
