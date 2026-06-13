/**
 * base44-compatible HTTP client backed by the local Express + Postgres API.
 * Same call surface as the localStorage mock and the real base44 SDK, so
 * pages don't need to change.
 *
 *   base44.entities.Product.list("-created_date", 100)
 *   base44.entities.Product.create({ ... })
 *   base44.entities.Product.update(id, { ... })
 *   base44.entities.Product.delete(id)
 *   base44.auth.login(email, password)
 *   base44.utils.recordSales(entries, sale_date)
 */

const API_BASE = '/api';

// ───────────────────────────────────────────────────────────────────────────
// DEMO MODE — when true, read endpoints return sample data and ALL writes are
// no-ops, so the database is never touched. Turn off by setting DEMO = false
// (and optionally delete this block + src/api/demoData.js).
// ───────────────────────────────────────────────────────────────────────────
import { DEMO_DATA } from './demoData';
const DEMO = true;

function demoList(resourcePath, sortKey, limit) {
  let rows = (DEMO_DATA[resourcePath] || []).slice();
  if (sortKey) {
    const desc = sortKey.startsWith('-');
    const key = desc ? sortKey.slice(1) : sortKey;
    rows.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (desc ? -1 : 1));
  }
  return limit ? rows.slice(0, limit) : rows;
}

async function http(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    },
    ...opts
  });
  let body = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!res.ok) {
    const msg = (body && body.error) || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function entity(resourcePath) {
  return {
    async list(sortKey, limit) {
      if (DEMO && DEMO_DATA[resourcePath]) return demoList(resourcePath, sortKey, limit);
      const params = new URLSearchParams();
      if (sortKey) params.set('sort', sortKey);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return http(`${resourcePath}${qs ? '?' + qs : ''}`);
    },
    async filter(query = {}, sortKey, limit) {
      // Server-side filter route is not implemented — fetch and filter on client.
      // (Acceptable for the small datasets in this app; can be extended later.)
      const all = await this.list(sortKey, limit);
      return all.filter((r) =>
        Object.entries(query).every(([k, v]) => r[k] === v)
      );
    },
    async get(id) {
      if (DEMO && DEMO_DATA[resourcePath]) return DEMO_DATA[resourcePath].find(r => r.id === id) || null;
      return http(`${resourcePath}/${id}`);
    },
    async create(data) {
      if (DEMO) return { id: `demo-tmp-${Math.round(performance.now())}`, ...data };
      return http(resourcePath, { method: 'POST', body: JSON.stringify(data) });
    },
    async bulkCreate(items) {
      // No bulk endpoint server-side yet; loop sequentially to preserve order.
      const created = [];
      for (const item of items) created.push(await this.create(item));
      return created;
    },
    async update(id, patch) {
      if (DEMO) return { id, ...patch };
      return http(`${resourcePath}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    },
    async delete(id) {
      if (DEMO) return { success: true };
      return http(`${resourcePath}/${id}`, { method: 'DELETE' });
    }
  };
}

const Product       = entity('/products');
const SalesEntry    = entity('/sales');
const ReturnEntry   = entity('/returns');
const Notification  = entity('/notifications');
// Stock movement is not used yet but kept for API parity with the mock client.
const StockMovement = entity('/stock-movements');

const DEMO_USER = { id: 'demo-user', email: 'demo@rozeskin.com', name: 'Demo Admin', role: 'Admin' };

const auth = {
  async me() {
    if (DEMO) return DEMO_USER; // auto-login for the static demo (no backend needed)
    try { return await http('/auth/me'); }
    catch { return null; }
  },
  async login(email, password) {
    if (DEMO) return { ok: true, user: { ...DEMO_USER, email: email || DEMO_USER.email } };
    try {
      const res = await http('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      return res; // { ok: true, user }
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  async logout() {
    if (DEMO) return { ok: true };
    return http('/auth/logout', { method: 'POST' });
  },
  async update(patch) {
    if (DEMO) return patch;
    const res = await http('/auth/me', { method: 'PATCH', body: JSON.stringify(patch) });
    return res.user || res;
  }
};

const admin = {
  async exportAll() {
    if (DEMO) return { exported_at: new Date().toISOString(), products: DEMO_DATA['/products'], sales_entries: DEMO_DATA['/sales'], notifications: DEMO_DATA['/notifications'] };
    return http('/admin/export');
  },
  async importAll(data) {
    if (DEMO) return { success: true };
    return http('/admin/import', { method: 'POST', body: JSON.stringify(data) });
  },
  async wipe() {
    if (DEMO) return { success: true };
    return http('/admin/wipe', { method: 'POST' });
  }
};

const utils = {
  async recordSales(entries, sale_date, source = 'manual') {
    if (DEMO) return [];
    const res = await http('/utils/record-sales', {
      method: 'POST',
      body: JSON.stringify({ entries, sale_date, source })
    });
    if (res?.notified?.length && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('rozes:notifications-changed'));
    }
    return res?.created || [];
  },
  async restock(product_id, quantity) {
    if (DEMO) return { success: true };
    return http('/utils/restock', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity })
    });
  },
  async reverseSale(sale_id) {
    if (DEMO) return { success: true };
    return http('/utils/reverse-sale', {
      method: 'POST',
      body: JSON.stringify({ sale_id })
    });
  },
  async recordReturns(entries, return_date, channel = 'website') {
    if (DEMO) return [];
    const res = await http('/utils/record-returns', {
      method: 'POST',
      body: JSON.stringify({ entries, return_date, channel })
    });
    return res?.created || [];
  },
  async resetDemo() {
    if (DEMO) return;
    await http('/admin/reset-demo', { method: 'POST' });
  }
};

const settings = {
  async get() {
    if (DEMO) return { alert_email: 'demo@example.com' };
    return http('/settings');
  },
  async update(patch) {
    if (DEMO) return patch;
    return http('/settings', { method: 'PATCH', body: JSON.stringify(patch) });
  }
};

export const base44 = {
  entities: { Product, SalesEntry, ReturnEntry, StockMovement, Notification },
  auth,
  admin,
  utils,
  settings
};
