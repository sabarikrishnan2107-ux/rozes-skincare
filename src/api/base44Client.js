/**
 * base44-compatible HTTP client backed by the Express + Postgres API.
 * Same call surface as the localStorage mock and the real base44 SDK, so
 * pages don't need to change.
 *
 *   base44.entities.Product.list("-created_date", 100)
 *   base44.entities.Product.create({ ... })
 *   base44.entities.Product.update(id, { ... })
 *   base44.entities.Product.delete(id)
 *   base44.auth.login(email, password)
 *   base44.utils.recordSales(entries, sale_date)
 *
 * API base: defaults to "/api" (Vite proxies this to the local server in dev).
 * For a deployed frontend that talks to a hosted backend, set VITE_API_BASE
 * (e.g. https://api.yourdomain.com/api) at build time.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
      return http(`${resourcePath}/${id}`);
    },
    async create(data) {
      return http(resourcePath, { method: 'POST', body: JSON.stringify(data) });
    },
    async bulkCreate(items) {
      // No bulk endpoint server-side yet; loop sequentially to preserve order.
      const created = [];
      for (const item of items) created.push(await this.create(item));
      return created;
    },
    async update(id, patch) {
      return http(`${resourcePath}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    },
    async delete(id) {
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

const auth = {
  async me() {
    try { return await http('/auth/me'); }
    catch { return null; }
  },
  async login(email, password) {
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
    return http('/auth/logout', { method: 'POST' });
  },
  async update(patch) {
    const res = await http('/auth/me', { method: 'PATCH', body: JSON.stringify(patch) });
    return res.user || res;
  }
};

const admin = {
  async exportAll() {
    return http('/admin/export');
  },
  async importAll(data) {
    return http('/admin/import', { method: 'POST', body: JSON.stringify(data) });
  },
  async wipe() {
    return http('/admin/wipe', { method: 'POST' });
  }
};

const utils = {
  async recordSales(entries, sale_date, source = 'manual') {
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
    return http('/utils/restock', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity })
    });
  },
  async reverseSale(sale_id) {
    return http('/utils/reverse-sale', {
      method: 'POST',
      body: JSON.stringify({ sale_id })
    });
  },
  async recordReturns(entries, return_date, channel = 'website') {
    const res = await http('/utils/record-returns', {
      method: 'POST',
      body: JSON.stringify({ entries, return_date, channel })
    });
    return res?.created || [];
  },
  async resetDemo() {
    await http('/admin/reset-demo', { method: 'POST' });
  }
};

const settings = {
  async get() {
    return http('/settings');
  },
  async update(patch) {
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
