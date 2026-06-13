import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtNumber } from '@/utils/format';

export default function TopProducts({ products, title = 'Best Sellers' }) {
  const max = products[0]?.quantity || 1;
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>
        ) : (
          <ul className="space-y-5">
            {products.map((p, i) => {
              const pct = (p.quantity / max) * 100;
              return (
                <li key={p.name}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-semibold">{p.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold tabular-nums">{fmtNumber(p.quantity)}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">units</div>
                    </div>
                  </div>
                  <div className="mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
