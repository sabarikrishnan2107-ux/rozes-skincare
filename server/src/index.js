import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import returnsRoutes from './routes/returns.js';
import notificationsRoutes from './routes/notifications.js';
import utilsRoutes from './routes/utils.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true
}));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'down', error: err.message });
  }
});

// Auth (public for login/me/logout, others require auth)
app.use('/api/auth', authRoutes);

// All entity routes require authentication
app.use('/api/products',      requireAuth, productsRoutes);
app.use('/api/sales',         requireAuth, salesRoutes);
app.use('/api/returns',       requireAuth, returnsRoutes);
app.use('/api/notifications', requireAuth, notificationsRoutes);
app.use('/api/utils',         requireAuth, utilsRoutes);
app.use('/api/admin',         requireAuth, adminRoutes);
app.use('/api/settings',      requireAuth, settingsRoutes);

// 404 + error handlers
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  console.error('unhandled:', err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\nRozes API ready on http://localhost:${PORT}`);
  console.log(`CORS origin: ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}`);
  console.log(`Database:    ${(process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@')}`);
});
