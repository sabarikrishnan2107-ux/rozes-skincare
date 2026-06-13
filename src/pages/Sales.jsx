import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Calendar, FileSpreadsheet, Layers, Loader2, Plus, Search, ShoppingBag, Trash2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import ComboProductPicker from '@/components/ComboProductPicker';
import { fmtAED, fmtDate, fmtNumber, todayISO } from '@/utils/format';
import { SALES_CHANNELS, channelLabel } from '@/utils/channels';
import { exportSalesExcel } from '@/utils/exporters';

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [singleOpen, setSingleOpen] = useState(false);
  const [single, setSingle] = useState({ product_id: '', quantity: 1, sale_date: todayISO(), channel: 'website', combo: false, items: [] });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([{ product_id: '', quantity: 1 }]);
  const [bulkDate, setBulkDate] = useState(todayISO());
  const [bulkChannel, setBulkChannel] = useState('website');

  const refresh = async () => {
    setLoading(true);
    const [prods, ss] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.SalesEntry.list('-sale_date', 500)
    ]);
    setProducts(prods);
    setSales(ss);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => sales.filter(s => {
    if (dateFilter && s.sale_date !== dateFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.product_name.toLowerCase().includes(q) && !s.sku.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [sales, search, dateFilter]);

  const todayStats = useMemo(() => {
    const today = todayISO();
    const todays = sales.filter(s => s.sale_date === today);
    return {
      revenue: todays.reduce((a, b) => a + (b.total_amount || 0), 0),
      units: todays.reduce((a, b) => a + (b.quantity || 0), 0),
      entries: todays.length
    };
  }, [sales]);

  const submitSingle = async (e) => {
    e.preventDefault();
    let entries;
    if (single.combo) {
      entries = single.items.filter(i => i.product_id && Number(i.quantity) > 0);
      if (entries.length === 0) { toast.error('Select at least one product for the combo'); return; }
    } else {
      if (!single.product_id) { toast.error('Pick a product'); return; }
      entries = [{ product_id: single.product_id, quantity: single.quantity }];
    }
    await base44.utils.recordSales(entries, single.sale_date, single.channel);
    toast.success(single.combo ? 'Combo sale recorded' : 'Sale recorded', {
      description: `${entries.length} item${entries.length === 1 ? '' : 's'} · ${channelLabel(single.channel)}`
    });
    setSingle({ product_id: '', quantity: 1, sale_date: todayISO(), channel: single.channel, combo: false, items: [] });
    setSingleOpen(false);
    refresh();
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    const valid = bulkRows.filter(r => r.product_id && Number(r.quantity) > 0);
    if (valid.length === 0) { toast.error('Add at least one row'); return; }
    await base44.utils.recordSales(valid, bulkDate, bulkChannel);
    toast.success('Bulk sales saved', { description: `${valid.length} entries · ${channelLabel(bulkChannel)}` });
    setBulkRows([{ product_id: '', quantity: 1 }]);
    setBulkDate(todayISO());
    setBulkOpen(false);
    refresh();
  };

  const reverse = async (id) => {
    await base44.utils.reverseSale(id);
    toast.success('Sale reversed', { description: 'Stock returned to inventory.' });
    refresh();
  };

  const downloadExcel = () => {
    if (filtered.length === 0) { toast.error('No sales to export'); return; }
    exportSalesExcel({ title: 'Sales', rows: filtered });
    toast.success('Excel downloaded', { description: `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtNumber(sales.length)} entries · {fmtAED(sales.reduce((a, b) => a + (b.total_amount || 0), 0))} lifetime
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadExcel}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)}><Layers className="h-4 w-4" /> Bulk entry</Button>
          <Button onClick={() => setSingleOpen(true)}><Plus className="h-4 w-4" /> Quick sale</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today's revenue", value: fmtAED(todayStats.revenue) },
          { label: 'Units today', value: fmtNumber(todayStats.units) },
          { label: 'Entries today', value: fmtNumber(todayStats.entries) }
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="mt-2 font-heading text-2xl font-semibold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search product or SKU…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="sm:w-56">
              <DatePicker value={dateFilter} onChange={setDateFilter} placeholder="Filter by date" />
            </div>
            {(search || dateFilter) && (
              <Button variant="ghost" onClick={() => { setSearch(''); setDateFilter(''); }}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-heading text-lg">No sales yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Start logging today's transactions.</p>
            <Button onClick={() => setSingleOpen(true)} className="mt-4"><Plus className="h-4 w-4" /> Quick sale</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">{fmtDate(s.sale_date)}</TableCell>
                    <TableCell className="font-medium">{s.product_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{s.sku}</TableCell>
                    <TableCell><Badge variant="outline">{channelLabel(s.source)}</Badge></TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{s.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{fmtAED(s.unit_price)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtAED(s.total_amount)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => reverse(s.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        title="Reverse sale (returns stock)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > 200 && (
              <div className="border-t p-3 text-center text-xs text-muted-foreground">
                Showing first 200 of {fmtNumber(filtered.length)} entries
              </div>
            )}
          </div>

          <div className="divide-y md:hidden">
            {filtered.slice(0, 100).map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.product_name}</div>
                  <div className="text-[11px] text-muted-foreground">{fmtDate(s.sale_date)} · qty {s.quantity} · {channelLabel(s.source)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{fmtAED(s.total_amount)}</div>
                  <button onClick={() => reverse(s.id)} className="mt-1 text-[11px] text-destructive">Reverse</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Single dialog */}
      <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick sale</DialogTitle>
            <DialogDescription>Stock will deduct automatically.</DialogDescription>
          </DialogHeader>
          <form id="single-form" onSubmit={submitSingle} className="space-y-4">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5">
              <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={single.combo}
                onChange={e => setSingle(s => ({ ...s, combo: e.target.checked }))} />
              <span className="text-sm font-medium">Combo pack — select multiple products</span>
            </label>

            {single.combo ? (
              <div className="space-y-1.5">
                <Label>Products in combo</Label>
                <ComboProductPicker
                  products={products}
                  value={single.items}
                  onChange={(items) => setSingle(s => ({ ...s, items }))}
                  requireStock
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select value={single.product_id} onValueChange={(v) => setSingle(s => ({ ...s, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a product…" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                        {p.name} · {fmtAED(p.price)} {p.stock_quantity <= 0 ? '(out)' : `(${p.stock_quantity} left)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {!single.combo && (
                <div className="space-y-1.5">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input id="qty" type="number" min="1" required value={single.quantity}
                    onChange={e => setSingle(s => ({ ...s, quantity: Number(e.target.value) }))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="dt">Date</Label>
                <DatePicker id="dt" value={single.sale_date}
                  onChange={(v) => setSingle(s => ({ ...s, sale_date: v }))} placeholder="Sale date" />
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={single.channel} onValueChange={(v) => setSingle(s => ({ ...s, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SALES_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(() => {
              const items = single.combo
                ? single.items
                : (single.product_id ? [{ product_id: single.product_id, quantity: single.quantity }] : []);
              if (items.length === 0) return null;
              const total = items.reduce((sum, it) => {
                const p = products.find(x => x.id === it.product_id);
                return sum + (p?.price || 0) * (Number(it.quantity) || 0);
              }, 0);
              return (
                <div className="flex items-center justify-between rounded-md bg-accent px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Total{single.combo ? ` · ${items.length} item${items.length === 1 ? '' : 's'}` : ''}
                  </span>
                  <span className="font-heading text-lg font-semibold text-primary">{fmtAED(total)}</span>
                </div>
              );
            })()}
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSingleOpen(false)}>Cancel</Button>
            <Button type="submit" form="single-form">Save sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk sales entry</DialogTitle>
            <DialogDescription>Log multiple products at once.</DialogDescription>
          </DialogHeader>
          <form id="bulk-form" onSubmit={submitBulk}>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sale date</Label>
                <DatePicker value={bulkDate} onChange={setBulkDate} placeholder="Sale date" />
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={bulkChannel} onValueChange={setBulkChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SALES_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              {bulkRows.map((row, idx) => {
                const p = products.find(x => x.id === row.product_id);
                return (
                  <div key={idx} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-7">
                      <Select value={row.product_id} onValueChange={(v) => setBulkRows(rows => rows.map((r, i) => i === idx ? { ...r, product_id: v } : r))}>
                        <SelectTrigger><SelectValue placeholder="Select a product…" /></SelectTrigger>
                        <SelectContent>
                          {products.map(pr => (
                            <SelectItem key={pr.id} value={pr.id} disabled={pr.stock_quantity <= 0}>
                              {pr.name} ({pr.stock_quantity} left)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" value={row.quantity}
                        onChange={e => setBulkRows(rows => rows.map((r, i) => i === idx ? { ...r, quantity: Number(e.target.value) } : r))} />
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium tabular-nums">
                      {p ? fmtAED(p.price * row.quantity) : '—'}
                    </div>
                    <button type="button" onClick={() => setBulkRows(rows => rows.filter((_, i) => i !== idx))}
                      className="col-span-1 justify-self-end p-2 text-muted-foreground hover:text-destructive transition" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <Button type="button" variant="ghost" onClick={() => setBulkRows(rows => [...rows, { product_id: '', quantity: 1 }])} className="mt-3">
              <Plus className="h-4 w-4" /> Add row
            </Button>
            <div className="mt-5 flex items-center justify-between rounded-md bg-accent px-4 py-3">
              <span className="text-sm text-muted-foreground">Bulk total</span>
              <span className="font-heading text-lg font-semibold text-primary">
                {fmtAED(bulkRows.reduce((sum, r) => {
                  const pr = products.find(x => x.id === r.product_id);
                  return sum + (pr ? pr.price * r.quantity : 0);
                }, 0))}
              </span>
            </div>
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button type="submit" form="bulk-form">Save all</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
