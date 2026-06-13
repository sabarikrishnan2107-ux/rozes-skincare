import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StockAlerts({ alerts }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Stock Alerts</CardTitle>
        <Link to="/products" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Manage products <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">All products are well-stocked.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 6).map(p => {
              const out = p.stock_quantity <= 0;
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                    out
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-warning/30 bg-warning/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${out ? 'text-destructive' : 'text-warning'}`} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{p.sku}</div>
                    </div>
                  </div>
                  <Badge variant={out ? 'destructive' : 'warning'} className="shrink-0">
                    {p.stock_quantity} left
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
