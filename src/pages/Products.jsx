import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Download, Loader2, Package, Pencil, Plus,
  Search, Trash2, Upload
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { fmtNumber } from '@/utils/format';
import { exportProductsCSV, importProductsCSV } from '@/utils/exporters';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Cleanser', 'Moisturizer', 'Serum', 'Sunscreen', 'Toner',
  'Mask', 'Eye Care', 'Body Care', 'Hair Care'
];

const empty = {
  name: '', sku: '', category: 'Cleanser', price: '',
  stock_quantity: '', low_stock_threshold: 10
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [confirmDel, setConfirmDel] = useState(null);
  const importRef = useRef(null);
  const [params] = useSearchParams();
  const focusId = params.get('focus');

  const refresh = async () => {
    setLoading(true);
    setProducts(await base44.entities.Product.list('-created_date'));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`prod-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
    setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background'), 2200);
  }, [focusId, products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (stockFilter === 'low' && p.stock_quantity > p.low_stock_threshold) return false;
      if (stockFilter === 'out' && p.stock_quantity > 0) return false;
      if (stockFilter === 'in' && p.stock_quantity <= 0) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, search, category, stockFilter]);

  const openNew = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku, category: p.category,
      price: String(p.price), stock_quantity: String(p.stock_quantity),
      low_stock_threshold: String(p.low_stock_threshold ?? 10)
    });
    setModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error('Missing fields', { description: 'Name and SKU are required.' });
      return;
    }
    const data = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category,
      price: Number(form.price) || 0,
      stock_quantity: Number(form.stock_quantity) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 10,
      initial_stock: editing ? editing.initial_stock : Number(form.stock_quantity) || 0
    };
    if (editing) {
      await base44.entities.Product.update(editing.id, data);
      toast.success('Product updated', { description: data.name });
    } else {
      await base44.entities.Product.create(data);
      toast.success('Product added', { description: data.name });
    }
    setModalOpen(false);
    refresh();
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    await base44.entities.Product.delete(confirmDel.id);
    toast.success('Product removed', { description: confirmDel.name });
    setConfirmDel(null);
    refresh();
  };

  const onImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importProductsCSV(file, async (rows) => {
      let added = 0;
      for (const r of rows) {
        if (r.name && r.sku) {
          await base44.entities.Product.create({
            ...r,
            initial_stock: r.initial_stock || r.stock_quantity || 0,
            low_stock_threshold: r.low_stock_threshold || 10
          });
          added++;
        }
      }
      toast.success('Import complete', { description: `Added ${added} product(s).` });
      refresh();
    });
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtNumber(products.length)} products in inventory
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={onImport} />
          <Button variant="outline" onClick={() => importRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={() => exportProductsCSV(products)}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-12 rounded-2xl pl-11 shadow-sm"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 rounded-2xl shadow-sm sm:w-44"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="h-12 rounded-2xl shadow-sm sm:w-44"><SelectValue placeholder="All Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in">In stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-heading text-lg font-bold">No products match</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or add a new product.</p>
            <Button onClick={openNew} className="mt-4"><Plus className="h-4 w-4" /> Add product</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={() => openEdit(p)}
              onDelete={() => setConfirmDel(p)}
            />
          ))}
        </div>
      )}

      {/* New / edit dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit product' : 'New product'}</DialogTitle>
            <DialogDescription>
              {editing ? editing.sku : 'Add a new item to your skincare line.'}
            </DialogDescription>
          </DialogHeader>
          <form id="product-form" onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-name">Product name</Label>
              <Input id="p-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU</Label>
              <Input id="p-sku" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Price (AED)</Label>
              <Input id="p-price" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-stock">{editing ? 'Current stock' : 'Initial stock'}</Label>
              <Input id="p-stock" type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-low">Low-stock threshold</Label>
              <Input id="p-low" type="number" min="0" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground">Alerts trigger when stock falls to or below this number.</p>
            </div>
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="product-form">{editing ? 'Save changes' : 'Add product'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              This permanently removes <span className="font-medium text-foreground">{confirmDel?.name}</span>. Past sales remain in your records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete }) {
  const out = product.stock_quantity <= 0;
  const low = !out && product.stock_quantity <= product.low_stock_threshold;

  const stockColor = out
    ? 'text-destructive'
    : low
      ? 'text-warning'
      : 'text-success';

  return (
    <div
      id={`prod-${product.id}`}
      className="group relative rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Top row: title + status pill / hover actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-bold leading-tight">{product.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {product.sku} · {product.category}
          </p>
        </div>

        <div className="relative flex shrink-0 items-center">
          {/* Status pill — visible by default, fades on hover */}
          <span
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold transition-opacity duration-200 group-hover:opacity-0',
              out
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {out ? 'out_of_stock' : 'active'}
          </span>

          {/* Hover actions — overlaid on the pill */}
          <div className="pointer-events-none absolute right-0 top-0 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
            <button
              onClick={onEdit}
              title="Edit"
              aria-label="Edit"
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              title="Delete"
              aria-label="Delete"
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Price + stock */}
      <div className="mt-6">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-2xl font-bold">{product.price}</span>
          <span className="text-sm text-muted-foreground">AED</span>
        </div>
        <div className={cn('mt-2 text-sm font-medium', stockColor)}>
          {product.stock_quantity} in stock
        </div>
      </div>
    </div>
  );
}
