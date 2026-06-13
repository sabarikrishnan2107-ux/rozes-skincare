// ───────────────────────────────────────────────────────────────────────────
// DEMO / SAMPLE DATA — for showing the UI only. NOTHING here is persisted to
// the database. To remove the demo entirely:
//   1) set DEMO = false in src/api/base44Client.js (or delete the DEMO block), and
//   2) delete this file.
// ───────────────────────────────────────────────────────────────────────────

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
const ts = (d) => d + 'T10:00:00.000Z';

export const demoProducts = [
  { name: 'Rose Glow Serum',        sku: 'RGS-001', category: 'Serum',       price: 120, stock_quantity: 42,  initial_stock: 80 },
  { name: 'Vitamin C Brightening',  sku: 'VCB-002', category: 'Serum',       price: 95,  stock_quantity: 8,   initial_stock: 60 },
  { name: 'Hydrating Day Cream',    sku: 'HDC-003', category: 'Moisturizer', price: 75,  stock_quantity: 110, initial_stock: 150 },
  { name: 'Night Repair Oil',       sku: 'NRO-004', category: 'Oil',         price: 140, stock_quantity: 5,   initial_stock: 50 },
  { name: 'Gentle Foaming Cleanser',sku: 'GFC-005', category: 'Cleanser',    price: 55,  stock_quantity: 200, initial_stock: 220 },
  { name: 'SPF 50 Sunscreen',       sku: 'SPF-006', category: 'Sunscreen',   price: 85,  stock_quantity: 64,  initial_stock: 120 },
  { name: 'Coconut Repair Shampoo', sku: 'CRS-007', category: 'Hair',        price: 48,  stock_quantity: 0,   initial_stock: 90 },
  { name: 'Lip Care Balm',          sku: 'LCB-008', category: 'Lip',         price: 25,  stock_quantity: 175, initial_stock: 200 }
].map((p, i) => ({
  ...p,
  id: `demo-p${i + 1}`,
  low_stock_threshold: 15,
  created_date: ts(daysAgo(120)),
  updated_date: ts(daysAgo(1))
}));

const CHANNELS = ['website', 'website', 'noon', 'amazon', 'manual']; // weighted toward website

export const demoSales = (() => {
  const arr = [];
  let id = 1;
  for (let i = 0; i < 75; i++) {           // last ~75 days → spans 3 months
    const date = daysAgo(i);
    const count = Math.floor(Math.random() * 3); // 0–2 orders/day
    for (let j = 0; j < count; j++) {
      const p = demoProducts[Math.floor(Math.random() * demoProducts.length)];
      const qty = 1 + Math.floor(Math.random() * 4);
      const source = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
      arr.push({
        id: `demo-s${id++}`,
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        quantity: qty,
        unit_price: p.price,
        total_amount: qty * p.price,
        sale_date: date,
        source,
        created_date: ts(date),
        updated_date: ts(date)
      });
    }
  }
  return arr;
})();

export const demoReturns = (() => {
  const arr = [];
  const reasons = ['Damaged in transit', 'Wrong item', 'Customer changed mind', 'Defective pump'];
  for (let i = 0; i < 9; i++) {
    const p = demoProducts[Math.floor(Math.random() * demoProducts.length)];
    const date = daysAgo(Math.floor(Math.random() * 40));
    arr.push({
      id: `demo-r${i + 1}`,
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      quantity: 1 + Math.floor(Math.random() * 2),
      channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      return_date: date,
      created_date: ts(date),
      updated_date: ts(date)
    });
  }
  return arr;
})();

export const demoNotifications = [
  { id: 'demo-n1', type: 'low_stock', severity: 'critical', title: 'Out of stock', message: 'Coconut Repair Shampoo is at 0 units (threshold 15).', product_id: 'demo-p7', read: false, created_date: ts(daysAgo(0)), updated_date: ts(daysAgo(0)) },
  { id: 'demo-n2', type: 'low_stock', severity: 'warning',  title: 'Low stock',    message: 'Night Repair Oil is at 5 units (threshold 15).',        product_id: 'demo-p4', read: false, created_date: ts(daysAgo(1)), updated_date: ts(daysAgo(1)) },
  { id: 'demo-n3', type: 'low_stock', severity: 'warning',  title: 'Low stock',    message: 'Vitamin C Brightening is at 8 units (threshold 15).',   product_id: 'demo-p2', read: true,  created_date: ts(daysAgo(2)), updated_date: ts(daysAgo(2)) }
];

// Map of resource path → demo dataset, used by the client's read interception.
export const DEMO_DATA = {
  '/products': demoProducts,
  '/sales': demoSales,
  '/returns': demoReturns,
  '/notifications': demoNotifications
};
