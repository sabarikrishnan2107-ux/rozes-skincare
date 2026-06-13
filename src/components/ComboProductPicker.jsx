import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fmtAED } from '@/utils/format';

/**
 * Multi-select product picker for combo packs.
 * value:    [{ product_id, quantity }]
 * onChange: (next) => void
 * requireStock: when true, out-of-stock products can't be selected (sales).
 */
export default function ComboProductPicker({ products, value, onChange, requireStock = false }) {
  const [search, setSearch] = useState('');

  const qtyById = useMemo(() => {
    const m = {};
    value.forEach(v => { m[v.product_id] = v.quantity; });
    return m;
  }, [value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const toggle = (p) => {
    if (qtyById[p.id] != null) {
      onChange(value.filter(v => v.product_id !== p.id));
    } else {
      onChange([...value, { product_id: p.id, quantity: 1 }]);
    }
  };

  const setQty = (id, qty) => {
    onChange(value.map(v => v.product_id === id ? { ...v, quantity: Math.max(1, Number(qty) || 1) } : v));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No products found.</div>
        ) : filtered.map(p => {
          const selected = qtyById[p.id] != null;
          const disabled = requireStock && p.stock_quantity <= 0;
          return (
            <div
              key={p.id}
              className={cn(
                'flex items-center gap-3 border-b px-3 py-2 last:border-b-0',
                selected && 'bg-accent/50',
                disabled && 'opacity-50'
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(p)}
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                  !disabled && 'hover:border-primary'
                )}
                aria-label={selected ? `Remove ${p.name}` : `Add ${p.name}`}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(p)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {fmtAED(p.price)} · {p.stock_quantity} in stock
                </div>
              </button>

              {selected && (
                <Input
                  type="number"
                  min="1"
                  value={qtyById[p.id]}
                  onChange={e => setQty(p.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="h-8 w-20 text-center"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        {value.length === 0 ? 'No products selected' : `${value.length} product${value.length === 1 ? '' : 's'} selected`}
      </div>
    </div>
  );
}
