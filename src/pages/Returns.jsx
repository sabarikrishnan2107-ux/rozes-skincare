import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2, Plus, RotateCcw, Search, Trash2, Undo2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import ComboProductPicker from '@/components/ComboProductPicker';
import { fmtDate, fmtNumber, todayISO } from '@/utils/format';
import { SALES_CHANNELS, channelLabel } from '@/utils/channels';
import { exportReturnsExcel } from '@/utils/exporters';

const emptyForm = () => ({ product_id: '', quantity: 1, channel: 'website', return_date: todayISO(), reason: '', combo: false, items: [] });

export default function Returns() {
  const [products, setProducts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const refresh = async () => {
    setLoading(true);
    const [prods, rs] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.ReturnEntry.list('-return_date', 500)
    ]);
    setProducts(prods);
    setReturns(rs);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => returns.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.product_name?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q);
  }), [returns, search]);

  const stats = useMemo(() => {
    const units = returns.reduce((a, r) => a + (r.quantity || 0), 0);
    const byChannel = {};
    returns.forEach(r => { byChannel[r.channel] = (byChannel[r.channel] || 0) + (r.quantity || 0); });
    return { count: returns.length, units, byChannel };
  }, [returns]);

  const submit = async (e) => {
    e.preventDefault();
    let entries;
    if (form.combo) {
      entries = form.items
        .filter(i => i.product_id && Number(i.quantity) > 0)
        .map(i => ({ product_id: i.product_id, quantity: Number(i.quantity), reason: form.reason }));
      if (entries.length === 0) { toast.error('Select at least one product for the combo'); return; }
    } else {
      if (!form.product_id) { toast.error('Pick a product'); return; }
      if (Number(form.quantity) <= 0) { toast.error('Quantity must be at least 1'); return; }
      entries = [{ product_id: form.product_id, quantity: Number(form.quantity), reason: form.reason }];
    }
    await base44.utils.recordReturns(entries, form.return_date, form.channel);
    toast.success(form.combo ? 'Combo return recorded' : 'Return recorded', {
      description: `${entries.length} item${entries.length === 1 ? '' : 's'} · stock increased · ${channelLabel(form.channel)}`
    });
    setForm(f => ({ ...emptyForm(), channel: f.channel }));
    setOpen(false);
    refresh();
  };

  const downloadExcel = () => {
    if (filtered.length === 0) { toast.error('No returns to export'); return; }
    exportReturnsExcel({ title: 'Returns', rows: filtered });
    toast.success('Excel downloaded', { description: `${filtered.length} ${filtered.length === 1 ? 'return' : 'returns'}` });
  };

  const removeReturn = async (id) => {
    try {
      await base44.entities.ReturnEntry.delete(id);
      toast.success('Return reversed', { description: 'Stock adjusted back.' });
      refresh();
    } catch (err) {
      toast.error('Could not reverse return', { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Returns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record returned orders — stock is added back automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadExcel}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add return</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total returns</div>
          <div className="mt-2 font-heading text-2xl font-semibold">{fmtNumber(stats.count)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Units returned</div>
          <div className="mt-2 font-heading text-2xl font-semibold">{fmtNumber(stats.units)}</div>
        </CardContent></Card>
        {SALES_CHANNELS.filter(c => c.value === 'noon' || c.value === 'amazon').map(c => (
          <Card key={c.value}><CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label} returns</div>
            <div className="mt-2 font-heading text-2xl font-semibold">{fmtNumber(stats.byChannel[c.value] || 0)}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search product or SKU…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Undo2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-heading text-lg">No returns yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Log a returned order to add its stock back.</p>
            <Button onClick={() => setOpen(true)} className="mt-4"><Plus className="h-4 w-4" /> Add return</Button>
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
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{fmtDate(r.return_date)}</TableCell>
                    <TableCell className="font-medium">{r.product_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.sku}</TableCell>
                    <TableCell><Badge variant="outline">{channelLabel(r.channel)}</Badge></TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-success">+{r.quantity}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{r.reason || '—'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => removeReturn(r.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        title="Reverse return (removes the added stock)"
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
                Showing first 200 of {fmtNumber(filtered.length)} returns
              </div>
            )}
          </div>

          <div className="divide-y md:hidden">
            {filtered.slice(0, 100).map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.product_name}</div>
                  <div className="text-[11px] text-muted-foreground">{fmtDate(r.return_date)} · {channelLabel(r.channel)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums text-success">+{r.quantity}</div>
                  <button onClick={() => removeReturn(r.id)} className="mt-1 text-[11px] text-destructive">Reverse</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add return</DialogTitle>
            <DialogDescription>The returned quantity is added back to stock.</DialogDescription>
          </DialogHeader>
          <form id="return-form" onSubmit={submit} className="space-y-4">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5">
              <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={form.combo}
                onChange={e => setForm(f => ({ ...f, combo: e.target.checked }))} />
              <span className="text-sm font-medium">Combo pack — return multiple products</span>
            </label>

            {form.combo ? (
              <div className="space-y-1.5">
                <Label>Products in combo</Label>
                <ComboProductPicker
                  products={products}
                  value={form.items}
                  onChange={(items) => setForm(f => ({ ...f, items }))}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a product…" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.stock_quantity} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {!form.combo && (
                <div className="space-y-1.5">
                  <Label htmlFor="rqty">Quantity</Label>
                  <Input id="rqty" type="number" min="1" required value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Return date</Label>
                <DatePicker value={form.return_date} onChange={(v) => setForm(f => ({ ...f, return_date: v }))} placeholder="Return date" />
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SALES_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="reason" rows={2} placeholder="e.g. damaged, wrong item, customer changed mind"
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>

            {(() => {
              const items = form.combo
                ? form.items
                : (form.product_id ? [{ product_id: form.product_id, quantity: form.quantity }] : []);
              if (items.length === 0) return null;
              const units = items.reduce((a, it) => a + (Number(it.quantity) || 0), 0);
              return (
                <div className="flex items-center justify-between rounded-md bg-accent px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Stock change{form.combo ? ` · ${items.length} product${items.length === 1 ? '' : 's'}` : ''}
                  </span>
                  <span className="font-heading text-lg font-semibold text-success">+{units} units</span>
                </div>
              );
            })()}
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="return-form"><RotateCcw className="h-4 w-4" /> Record return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
