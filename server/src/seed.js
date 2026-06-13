import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { pool, query, tx } from './db.js';

const DEMO_USER = {
  email: 'admin@rozeskin.com',
  password: 'rozes123',
  name: 'Aria Bloom',
  role: 'Admin'
};

const DEMO_PRODUCTS = [
  { name: 'Acne Control Cleanser',        sku: 'RZ-001', category: 'Cleanser',    price: 45, stock_quantity: 120, initial_stock: 150, low_stock_threshold: 10 },
  { name: 'Coconut Milk Keratin Shampoo', sku: 'RZ-002', category: 'Hair Care',   price: 55, stock_quantity: 85,  initial_stock: 100, low_stock_threshold: 10 },
  { name: 'Velvet Glow Body Lotion',      sku: 'RZ-003', category: 'Body Care',   price: 50, stock_quantity: 8,   initial_stock: 80,  low_stock_threshold: 10 },
  { name: 'Rice Cleanser',                sku: 'RZ-004', category: 'Cleanser',    price: 42, stock_quantity: 65,  initial_stock: 90,  low_stock_threshold: 10 },
  { name: 'Rice Moisturizing Cream',      sku: 'RZ-005', category: 'Moisturizer', price: 60, stock_quantity: 0,   initial_stock: 70,  low_stock_threshold: 10 },
  { name: 'Vitamin C Serum',              sku: 'RZ-006', category: 'Serum',       price: 75, stock_quantity: 45,  initial_stock: 60,  low_stock_threshold: 10 },
  { name: 'Hydrating Toner',              sku: 'RZ-007', category: 'Toner',       price: 38, stock_quantity: 92,  initial_stock: 100, low_stock_threshold: 10 },
  { name: 'SPF50 Sunscreen',              sku: 'RZ-008', category: 'Sunscreen',   price: 65, stock_quantity: 5,   initial_stock: 60,  low_stock_threshold: 10 }
];

export async function runSeed() {
  // Ensure demo user exists
  const { rowCount: hasUser } = await query('SELECT 1 FROM users LIMIT 1');
  if (!hasUser) {
    const hash = await bcrypt.hash(DEMO_USER.password, 10);
    await query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
      [DEMO_USER.email, hash, DEMO_USER.name, DEMO_USER.role]
    );
    console.log(`  ✓ created demo user ${DEMO_USER.email} (password: ${DEMO_USER.password})`);
  } else {
    console.log('  ✓ users table already populated');
  }

  // Seed products + sales only if empty
  const { rowCount: hasProducts } = await query('SELECT 1 FROM products LIMIT 1');
  if (hasProducts) {
    console.log('  ✓ products table already populated, skipping');
    return;
  }

  await tx(async (client) => {
    const productIds = [];
    for (const p of DEMO_PRODUCTS) {
      const { rows: [created] } = await client.query(
        `INSERT INTO products (name, sku, category, price, stock_quantity, initial_stock, low_stock_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, sku, price::float8 AS price`,
        [p.name, p.sku, p.category, p.price, p.stock_quantity, p.initial_stock, p.low_stock_threshold]
      );
      productIds.push(created);
    }
    console.log(`  ✓ inserted ${productIds.length} products`);

    // Generate ~60 days of fake sales
    const sales = [];
    for (let d = 60; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dailyEntries = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < dailyEntries; i++) {
        const product = productIds[Math.floor(Math.random() * productIds.length)];
        const qty = 1 + Math.floor(Math.random() * 5);
        sales.push([
          product.id, product.name, product.sku,
          qty, product.price, qty * product.price,
          date.toISOString().slice(0, 10),
          'manual',
          date.toISOString()
        ]);
      }
    }

    for (const s of sales) {
      await client.query(
        `INSERT INTO sales_entries
           (product_id, product_name, sku, quantity, unit_price, total_amount, sale_date, source, created_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        s
      );
    }
    console.log(`  ✓ inserted ${sales.length} demo sales`);
  });
}

// Run directly (cross-platform entry-point detection)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeed()
    .then(() => { console.log('\nSeed complete.'); pool.end(); })
    .catch((err) => { console.error('Seed failed:', err); pool.end(); process.exit(1); });
}
