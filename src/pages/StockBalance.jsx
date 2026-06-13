import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, Boxes, Loader2, PackagePlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import StatCard from '@/components/dashboard/StatCard';
import { fmtAED, fmtNumber } from '@/utils/format';
import { cn } from '@/lib/utils';

export default function StockBalance() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [restockTarget, setRestockTarget] = useState(null);
  const [restockQty, setRestockQty] = useState('');

  const refresh = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.SalesEntry.list()
    ]);
    setProducts(p);
    setSales(s);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const rows = useMemo(() => {
    return products
      .map(p => {
        const sold = sales.filter(s => s.product_id === p.id).reduce((a, b) => a + (b.quantity || 0), 0);
        const expected = Math.max(0, (p.initial_stock || 0) - sold);
        const diff = p.stock_quantity - expected;
        const value = p.stock_quantity * p.price;
        return { ...p, sold, expected, diff, value };
      })
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.stock_quantity - b.stock_quantity);
  }, [products, sales, search]);

  const totals = useMemo(() => {
    const totalUnits = products.reduce((a, p) => a + Math.max(0, p.stock_quantity), 0);
    const totalValue = products.reduce((a, p) => a + Math.max(0, p.stock_quantity) * p.price, 0);
    const lowCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length;
    const outCount = products.filter(p => p.stock_quantity <= 0).length;
    const mismatchCount = rows.filter(r => r.diff !== 0).length;
    return { totalUnits, totalValue, lowCount, outCount, mismatchCount };
  }, [products, rows]);

  const doRestock = async () => {
    const qty = Number(restockQty) || 0;
    if (qty <= 0) { toast.error('Enter a quantity'); return; }
    await base44.utils.restock(restockTarget.id, qty);
    toast.success('Restocked', { description: `${qty} units added.` });
    setRestockTarget(null);
    setRestockQty('');
    refresh();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Stock Balance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time inventory status and reconciliation against recorded sales.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Stock Units" value={fmtNumber(totals.totalUnits)} icon={Boxes} />
        <StatCard title="Stock Value" value={fmtAED(totals.totalValue)} icon={ArrowDownToLine} />
        <StatCard title="Low Stock" value={fmtNumber(totals.lowCount)} icon={AlertTriangle}
          subtitle={`${totals.outCount} out of stock`} />
        <StatCard title="Mismatches" value={fmtNumber(totals.mismatchCount)} icon={AlertTriangle}
          subtitle={totals.mismatchCount === 0 ? 'All matched' : 'Needs review'} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Initial</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Diff</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => {
              const out = r.stock_quantity <= 0;
              const low = r.stock_quantity <= r.low_stock_threshold;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{r.sku}</div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{r.initial_stock}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{r.sold}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{r.expected}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn('font-semibold tabular-nums', out && 'text-destructive', low && !out && 'text-warning')}>
                      {r.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.diff === 0
                      ? <Badge variant="success">OK</Badge>
                      : (
                        <span className={cn('font-semibold tabular-nums', r.diff < 0 ? 'text-destructive' : 'text-success')}>
                          {r.diff > 0 ? '+' : ''}{r.diff}
                        </span>
                      )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtAED(r.value)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setRestockTarget(r); setRestockQty(''); }}>
                      <PackagePlus className="h-4 w-4" /> Restock
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!restockTarget} onOpenChange={(o) => !o && setRestockTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restock</DialogTitle>
            <DialogDescription>
              {restockTarget?.name} · current: <span className="font-medium text-foreground">{restockTarget?.stock_quantity}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rsq">Quantity to add</Label>
            <Input id="rsq" type="number" min="1" autoFocus value={restockQty} onChange={e => setRestockQty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestockTarget(null)}>Cancel</Button>
            <Button onClick={doRestock}>Add stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
