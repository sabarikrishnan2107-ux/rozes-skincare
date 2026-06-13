import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtAED, fmtNumber } from '@/utils/format';
import { cn } from '@/lib/utils';

// Medal tints for the top three.
const RANK = [
  'bg-amber-400 text-amber-950',   // gold
  'bg-slate-300 text-slate-800',   // silver
  'bg-orange-400 text-orange-950'  // bronze
];

export default function TopProducts({ products, title = 'Best Sellers' }) {
  const max = products[0]?.quantity || 1;
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="text-sm font-medium text-foreground">No sales yet</div>
            <div className="text-xs text-muted-foreground">Your top products will rank here.</div>
          </div>
        ) : (
          <ul className="space-y-5">
            {products.map((p, i) => {
              const pct = (p.quantity / max) * 100;
              return (
                <li key={p.name}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        RANK[i] || 'bg-muted text-muted-foreground'
                      )}>
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-semibold">{p.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold tabular-nums">{fmtNumber(p.quantity)} <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">units</span></div>
                      <div className="text-[11px] tabular-nums text-muted-foreground">{fmtAED(p.revenue)}</div>
                    </div>
                  </div>
                  <div className="mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all', i === 0 ? 'bg-primary' : 'bg-primary/60')}
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
