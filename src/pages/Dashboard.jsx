import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { DollarSign, Globe, Layers, Loader2, Package, ShoppingBag, ShoppingCart, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/dashboard/StatCard';
import SalesChart from '@/components/dashboard/SalesChart';
import TopProducts from '@/components/dashboard/TopProducts';
import StockAlerts from '@/components/dashboard/StockAlerts';
import { fmtAED } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { channelLabel } from '@/utils/channels';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(''); // '' = All time

  useEffect(() => {
    const load = async () => {
      const [prods, salesData, returnsData] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.SalesEntry.list('-sale_date', 500),
        base44.entities.ReturnEntry.list('-return_date', 500)
      ]);
      setProducts(prods);
      setSales(salesData);
      setReturns(returnsData);
      setLoading(false);
    };
    load();
  }, []);

  // Months that have any sales or returns, newest first.
  const months = useMemo(() => {
    const set = new Set();
    sales.forEach(s => { if (s.sale_date) set.add(s.sale_date.slice(0, 7)); });
    returns.forEach(r => { if (r.return_date) set.add(r.return_date.slice(0, 7)); });
    return Array.from(set).sort().reverse();
  }, [sales, returns]);

  const periodLabel = selectedMonth ? moment(selectedMonth + '-01').format('MMMM YYYY') : 'All time';

  const scopedSales = useMemo(
    () => (selectedMonth ? sales.filter(s => s.sale_date?.startsWith(selectedMonth)) : sales),
    [sales, selectedMonth]
  );
  const scopedReturns = useMemo(
    () => (selectedMonth ? returns.filter(r => r.return_date?.startsWith(selectedMonth)) : returns),
    [returns, selectedMonth]
  );

  const stats = useMemo(() => ({
    revenue: scopedSales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
    units: scopedSales.reduce((sum, s) => sum + (s.quantity || 0), 0),
    orders: scopedSales.length,
    totalStock: products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0)
  }), [scopedSales, products]);

  const chartData = useMemo(() => {
    if (selectedMonth) {
      const start = moment(selectedMonth + '-01');
      const days = start.daysInMonth();
      const arr = [];
      for (let d = 1; d <= days; d++) {
        const dateStr = start.clone().date(d).format('YYYY-MM-DD');
        const daySales = scopedSales.filter(s => s.sale_date === dateStr);
        arr.push({
          label: String(d),
          revenue: daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
          units: daySales.reduce((sum, s) => sum + (s.quantity || 0), 0)
        });
      }
      return arr;
    }
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      const daySales = sales.filter(s => s.sale_date === dateStr);
      last7Days.push({
        label: date.format('ddd'),
        revenue: daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
        units: daySales.reduce((sum, s) => sum + (s.quantity || 0), 0)
      });
    }
    return last7Days;
  }, [scopedSales, sales, selectedMonth]);

  const topProducts = useMemo(() => {
    const productMap = {};
    scopedSales.forEach(s => {
      if (!productMap[s.product_name]) productMap[s.product_name] = { name: s.product_name, quantity: 0, revenue: 0 };
      productMap[s.product_name].quantity += s.quantity || 0;
      productMap[s.product_name].revenue += s.total_amount || 0;
    });
    return Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [scopedSales]);

  const channelCounts = useMemo(() => {
    const c = {
      website: { count: 0, revenue: 0 },
      noon:    { count: 0, revenue: 0 },
      amazon:  { count: 0, revenue: 0 }
    };
    let totalCount = 0;
    let totalRevenue = 0;
    scopedSales.forEach(s => {
      totalCount += 1;
      totalRevenue += s.total_amount || 0;
      const k = s.source;
      if (c[k]) { c[k].count += 1; c[k].revenue += s.total_amount || 0; }
    });
    return { ...c, totalCount, totalRevenue };
  }, [scopedSales]);

  const returnsByChannel = useMemo(() => {
    const map = {};
    let totalUnits = 0;
    scopedReturns.forEach(r => {
      const key = r.channel || 'other';
      map[key] = (map[key] || 0) + (r.quantity || 0);
      totalUnits += r.quantity || 0;
    });
    return { map, totalUnits };
  }, [scopedReturns]);

  const byChannel = useMemo(() => {
    const map = {};
    let total = 0;
    scopedSales.forEach(s => {
      const key = s.source || 'other';
      if (!map[key]) map[key] = { key, label: channelLabel(key), revenue: 0, units: 0 };
      map[key].revenue += s.total_amount || 0;
      map[key].units += s.quantity || 0;
      total += s.total_amount || 0;
    });
    return {
      total,
      soldUnits: scopedSales.reduce((a, s) => a + (s.quantity || 0), 0),
      rows: Object.values(map)
        .map(r => ({ ...r, returned: returnsByChannel.map[r.key] || 0, share: total > 0 ? (r.revenue / total) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
    };
  }, [scopedSales, returnsByChannel]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter(p => p.stock_quantity <= (p.low_stock_threshold || 10))
      .sort((a, b) => a.stock_quantity - b.stock_quantity);
  }, [products]);

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
          <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Here's your business overview.</p>
        </div>
        <div className="sm:w-52">
          <Select value={selectedMonth || 'all'} onValueChange={(v) => setSelectedMonth(v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              {months.map(m => (
                <SelectItem key={m} value={m}>{moment(m + '-01').format('MMMM YYYY')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Revenue"     value={fmtAED(stats.revenue)} icon={DollarSign} accent="emerald" subtitle={periodLabel} />
        <StatCard title="Units Sold"  value={stats.units.toLocaleString()} icon={ShoppingCart} accent="blue" subtitle={periodLabel} />
        <StatCard title="Orders"      value={stats.orders.toLocaleString()} icon={TrendingUp} accent="violet" subtitle={periodLabel} />
        <StatCard title="Stock in Hand" value={stats.totalStock.toLocaleString()} icon={Package} accent="amber"
          subtitle={`${lowStockProducts.length} low-stock alerts`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Website Orders" value={channelCounts.website.count.toLocaleString()} icon={Globe} accent="blue"
          subtitle={fmtAED(channelCounts.website.revenue)} />
        <StatCard title="Noon Orders"    value={channelCounts.noon.count.toLocaleString()} icon={ShoppingBag} accent="amber"
          subtitle={fmtAED(channelCounts.noon.revenue)} />
        <StatCard title="Amazon Orders"  value={channelCounts.amazon.count.toLocaleString()} icon={ShoppingBag} accent="rose"
          subtitle={fmtAED(channelCounts.amazon.revenue)} />
        <StatCard title="Total Orders"   value={channelCounts.totalCount.toLocaleString()} icon={Layers} accent="primary"
          subtitle={fmtAED(channelCounts.totalRevenue)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={chartData} title={selectedMonth ? `Revenue · ${periodLabel}` : 'Revenue (Last 7 Days)'} />
        </div>
        <TopProducts products={topProducts} title="Best Sellers" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales by channel · {periodLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {byChannel.rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <div className="space-y-4">
              {byChannel.rows.map(c => (
                <div key={c.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{c.label}</span>
                    <span className="text-sm tabular-nums">
                      <span className="font-semibold">{fmtAED(c.revenue)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.units.toLocaleString()} sold
                        {c.returned > 0 && <span className="text-destructive"> · {c.returned.toLocaleString()} returned</span>}
                        {' · '}{c.share.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${c.share}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Total revenue (all channels)</span>
                <span className="font-heading text-lg font-semibold text-primary tabular-nums">{fmtAED(byChannel.total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net units (sold − returned)</span>
                <span className="font-medium tabular-nums">
                  {byChannel.soldUnits.toLocaleString()} − {returnsByChannel.totalUnits.toLocaleString()} ={' '}
                  <span className="font-semibold">{(byChannel.soldUnits - returnsByChannel.totalUnits).toLocaleString()}</span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <StockAlerts alerts={lowStockProducts} />
    </div>
  );
}
