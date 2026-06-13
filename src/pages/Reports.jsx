import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  AlertTriangle, Calendar, FileDown, FileSpreadsheet, Loader2, Package, TrendingUp
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import StatCard from '@/components/dashboard/StatCard';
import { fmtAED, fmtDate, fmtNumber } from '@/utils/format';
import { exportSalesPDF, exportSalesExcel } from '@/utils/exporters';

const PIE_COLORS = ['#cc4624', '#e67a52', '#f0a884', '#9c3a1d', '#b54122', '#783019', '#f5cdb8', '#fbe5d6'];

export default function Reports() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Product.list(),
      base44.entities.SalesEntry.list(),
      base44.entities.ReturnEntry.list('-return_date', 500)
    ]).then(([p, s, r]) => { setProducts(p); setSales(s); setReturns(r); setLoading(false); });
  }, []);

  const months = useMemo(() => {
    const set = new Set(sales.map(s => s.sale_date?.slice(0, 7)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [sales]);

  const [selectedMonth, setSelectedMonth] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (months.length > 0 && !selectedMonth) setSelectedMonth(months[0]);
  }, [months, selectedMonth]);

  const filtered = useMemo(() => sales.filter(s => {
    if (from && s.sale_date < from) return false;
    if (to && s.sale_date > to) return false;
    if (!from && !to && selectedMonth) return s.sale_date?.startsWith(selectedMonth);
    return true;
  }), [sales, selectedMonth, from, to]);

  const filteredReturns = useMemo(() => returns.filter(r => {
    if (from && r.return_date < from) return false;
    if (to && r.return_date > to) return false;
    if (!from && !to && selectedMonth) return r.return_date?.startsWith(selectedMonth);
    return true;
  }), [returns, selectedMonth, from, to]);

  const summary = useMemo(() => {
    const totalRevenue = filtered.reduce((a, b) => a + (b.total_amount || 0), 0);
    const totalUnits = filtered.reduce((a, b) => a + (b.quantity || 0), 0);
    const productsSold = new Set(filtered.map(s => s.product_id)).size;
    const avgOrder = filtered.length > 0 ? totalRevenue / filtered.length : 0;
    return { totalRevenue, totalUnits, productsSold, avgOrder };
  }, [filtered]);

  const byProduct = useMemo(() => {
    const map = new Map();
    filtered.forEach(s => {
      const cur = map.get(s.product_id) || { id: s.product_id, name: s.product_name, units: 0, revenue: 0 };
      cur.units += s.quantity || 0;
      cur.revenue += s.total_amount || 0;
      map.set(s.product_id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map();
    filtered.forEach(s => {
      const product = products.find(p => p.id === s.product_id);
      const cat = product?.category || 'Other';
      const cur = map.get(cat) || { name: cat, value: 0 };
      cur.value += s.total_amount || 0;
      map.set(cat, cur);
    });
    return Array.from(map.values());
  }, [filtered, products]);

  const stockLoss = useMemo(() => products.map(p => {
    const sold = sales.filter(s => s.product_id === p.id).reduce((a, b) => a + (b.quantity || 0), 0);
    const expected = (p.initial_stock || 0) - sold;
    const diff = p.stock_quantity - expected;
    return { ...p, sold, expected, diff };
  }).filter(x => x.diff !== 0), [products, sales]);

  const rangeLabel = from || to
    ? `${from || '…'} → ${to || '…'}`
    : selectedMonth ? `${formatMonthLabel(selectedMonth)} (${filtered.length} entries)` : '';

  const exportPDF = () => {
    if (filtered.length === 0) { toast.error('Nothing to export'); return; }
    exportSalesPDF({
      title: `Sales Report ${selectedMonth || 'Custom'}`,
      rangeLabel,
      summary: {
        'Total revenue': fmtAED(summary.totalRevenue),
        'Total units': fmtNumber(summary.totalUnits),
        'Products sold': fmtNumber(summary.productsSold),
        'Average order': fmtAED(summary.avgOrder)
      },
      rows: filtered,
      returns: filteredReturns
    });
    toast.success('PDF exported');
  };

  const exportExcel = () => {
    if (filtered.length === 0) { toast.error('Nothing to export'); return; }
    exportSalesExcel({ title: `Sales Report ${selectedMonth || 'Custom'}`, rows: filtered, returns: filteredReturns });
    toast.success('Excel exported');
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rangeLabel || 'No data yet'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={exportPDF}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setFrom(''); setTo(''); }}>
                <SelectTrigger><SelectValue placeholder="Choose a month" /></SelectTrigger>
                <SelectContent>
                  {months.length === 0 && <SelectItem value="--">No data</SelectItem>}
                  {months.map(m => <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <DatePicker value={from} onChange={setFrom} placeholder="Start date" />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <DatePicker value={to} onChange={setTo} placeholder="End date" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total revenue"   value={fmtAED(summary.totalRevenue)} icon={TrendingUp} />
        <StatCard title="Units sold"      value={fmtNumber(summary.totalUnits)} icon={Package} />
        <StatCard title="Products sold"   value={fmtNumber(summary.productsSold)} icon={Package} />
        <StatCard title="Avg. transaction" value={fmtAED(summary.avgOrder)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue by product</CardTitle></CardHeader>
          <CardContent>
            {byProduct.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No sales in selected range.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={byProduct.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={130} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                      cursor={{ fill: 'hsl(var(--accent))' }}
                      formatter={(v) => fmtAED(v)}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Category mix</CardTitle></CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3} stroke="none">
                      {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                      formatter={(v) => fmtAED(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Stock reconciliation</CardTitle>
          {stockLoss.length === 0
            ? <Badge variant="success">All matched</Badge>
            : <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> {stockLoss.length} mismatch</Badge>}
        </CardHeader>
        <CardContent>
          {stockLoss.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every product's current stock matches initial − sold. No losses detected.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Initial</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockLoss.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{p.initial_stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{p.sold}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{p.expected}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.stock_quantity}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${p.diff < 0 ? 'text-destructive' : 'text-success'}`}>
                      {p.diff > 0 ? '+' : ''}{p.diff}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <p className="text-xs text-muted-foreground">{filtered.length} entries</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">{fmtDate(s.sale_date)}</TableCell>
                  <TableCell>{s.product_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.quantity}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{fmtAED(s.total_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length > 100 && (
            <div className="border-t p-3 text-center text-xs text-muted-foreground">
              Showing first 100 · export PDF or Excel for the full report
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatMonthLabel(key) {
  return moment(key + '-01').format('MMMM YYYY');
}
