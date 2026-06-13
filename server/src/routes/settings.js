import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// Whitelist of editable setting keys.
const ALLOWED_KEYS = new Set(['alert_email']);

async function readAll() {
  const { rows } = await query('SELECT key, value FROM app_settings');
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** GET /api/settings -> { alert_email: "..." } */
router.get('/', async (req, res) => {
  try {
    res.json(await readAll());
  } catch (err) {
    console.error('settings GET error', err);
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/settings  Body: { alert_email?: "..." } */
router.patch('/', async (req, res) => {
  const body = req.body || {};
  const updates = Object.entries(body).filter(([k]) => ALLOWED_KEYS.has(k));
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid settings to update' });
  }

  try {
    for (const [key, raw] of updates) {
      const value = raw == null ? '' : String(raw).trim();
      if (key === 'alert_email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      await query(
        `INSERT INTO app_settings (key, value, updated_date)
         VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_date = now()`,
        [key, value]
      );
    }
    res.json(await readAll());
  } catch (err) {
    console.error('settings PATCH error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

/** Helper for other routes: resolve the configured alert recipient. */
export async function getAlertEmail() {
  const { rows } = await query(
    `SELECT value FROM app_settings WHERE key = 'alert_email'`
  );
  const v = rows[0]?.value?.trim();
  return v || null;
}
