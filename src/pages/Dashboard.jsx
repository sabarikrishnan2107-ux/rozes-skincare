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
import { channelLabel } from '@/utils/channels';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const stats = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    const thisMonth = moment().format('YYYY-MM');
    const lastMonth = moment().subtract(1, 'month').format('YYYY-MM');

    const todaySales = sales.filter(s => s.sale_date === today);
    const monthSales = sales.filter(s => s.sale_date?.startsWith(thisMonth));
    const lastMonthSales = sales.filter(s => s.sale_date?.startsWith(lastMonth));

    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const monthRevenue = monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalUnits = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalStock = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) + '%'
      : null;

    return { todayRevenue, monthRevenue, totalUnits, totalStock, revenueChange, lastMonthRevenue };
  }, [products, sales]);

  const chartData = useMemo(() => {
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
  }, [sales]);

  const topProducts = useMemo(() => {
    const productMap = {};
    sales.forEach(s => {
      if (!productMap[s.product_name]) productMap[s.product_name] = { name: s.product_name, quantity: 0, revenue: 0 };
      productMap[s.product_name].quantity += s.quantity || 0;
      productMap[s.product_name].revenue += s.total_amount || 0;
    });
    return Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [sales]);

  const channelCounts = useMemo(() => {
    const c = {
      website: { count: 0, revenue: 0 },
      noon:    { count: 0, revenue: 0 },
      amazon:  { count: 0, revenue: 0 }
    };
    let totalCount = 0;
    let totalRevenue = 0;
    sales.forEach(s => {
      totalCount += 1;
      totalRevenue += s.total_amount || 0;
      const k = s.source;
      if (c[k]) { c[k].count += 1; c[k].revenue += s.total_amount || 0; }
    });
    return { ...c, totalCount, totalRevenue };
  }, [sales]);

  const returnsByChannel = useMemo(() => {
    const map = {};
    let totalUnits = 0;
    returns.forEach(r => {
      const key = r.channel || 'other';
      map[key] = (map[key] || 0) + (r.quantity || 0);
      totalUnits += r.quantity || 0;
    });
    return { map, totalUnits };
  }, [returns]);

  const byChannel = useMemo(() => {
    const map = {};
    let total = 0;
    sales.forEach(s => {
      const key = s.source || 'other';
      if (!map[key]) map[key] = { key, label: channelLabel(key), revenue: 0, units: 0 };
      map[key].revenue += s.total_amount || 0;
      map[key].units += s.quantity || 0;
      total += s.total_amount || 0;
    });
    return {
      total,
      soldUnits: sales.reduce((a, s) => a + (s.quantity || 0), 0),
      rows: Object.values(map)
        .map(r => ({ ...r, returned: returnsByChannel.map[r.key] || 0, share: total > 0 ? (r.revenue / total) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
    };
  }, [sales, returnsByChannel]);

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
      <div>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back. Here's your business overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Revenue"  value={fmtAED(stats.todayRevenue)}  icon={DollarSign} />
        <StatCard title="Monthly Revenue"  value={fmtAED(stats.monthRevenue)}  icon={TrendingUp}
          trend={stats.monthRevenue >= stats.lastMonthRevenue ? 'up' : 'down'}
          trendValue={stats.revenueChange} />
        <StatCard title="Total Units Sold" value={stats.totalUnits.toLocaleString()} icon={ShoppingCart} />
        <StatCard title="Stock in Hand"    value={stats.totalStock.toLocaleString()} icon={Package}
          subtitle={`${lowStockProducts.length} low-stock alerts`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Website Orders" value={channelCounts.website.count.toLocaleString()} icon={Globe}
          subtitle={fmtAED(channelCounts.website.revenue)} />
        <StatCard title="Noon Orders"    value={channelCounts.noon.count.toLocaleString()} icon={ShoppingBag}
          subtitle={fmtAED(channelCounts.noon.revenue)} />
        <StatCard title="Amazon Orders"  value={channelCounts.amazon.count.toLocaleString()} icon={ShoppingBag}
          subtitle={fmtAED(channelCounts.amazon.revenue)} />
        <StatCard title="Total Orders"   value={channelCounts.totalCount.toLocaleString()} icon={Layers}
          subtitle={fmtAED(channelCounts.totalRevenue)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={chartData} title="Revenue (Last 7 Days)" />
        </div>
        <TopProducts products={topProducts} title="Best Sellers" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales by channel</CardTitle>
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
