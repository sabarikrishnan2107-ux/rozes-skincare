/**
 * Convert a base44-style sort key (e.g. "-created_date" or "name") into
 * a safe SQL ORDER BY clause. Returns "" if no sort key.
 *
 * Whitelist columns to prevent SQL injection.
 */
const SORTABLE = new Set([
  'created_date', 'updated_date', 'sale_date',
  'name', 'sku', 'category', 'price', 'stock_quantity', 'low_stock_threshold',
  'quantity', 'unit_price', 'total_amount', 'product_name',
  'severity', 'type', 'read'
]);

export function sortClause(sortKey) {
  if (!sortKey) return '';
  const desc = sortKey.startsWith('-');
  const col = desc ? sortKey.slice(1) : sortKey;
  if (!SORTABLE.has(col)) return '';
  return ` ORDER BY ${col} ${desc ? 'DESC' : 'ASC'}`;
}

export function parseLimit(value, fallback = 1000) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) return fallback;
  return Math.min(n, 5000);
}
