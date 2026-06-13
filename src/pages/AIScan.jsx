import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Camera, Check, Eye, ImagePlus, Layers, Loader2, Plus, RefreshCcw,
  ScanLine, Sparkles, Trash2, Unlink
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { runOCR, parseSalesText } from '@/utils/ocr';
import { fmtAED, todayISO } from '@/utils/format';

export default function AIScan() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [text, setText] = useState('');
  const [entries, setEntries] = useState([]);
  const [combos, setCombos] = useState({}); // combo_id → { bundle_price }
  const [date, setDate] = useState(todayISO());
  const fileRef = useRef(null);

  useEffect(() => {
    base44.entities.Product.list().then(p => { setProducts(p); setLoading(false); });
  }, []);

  const onFile = (f) => {
    if (!f) return;
    setFile(f);
    setEntries([]);
    setText('');
    setPreview(URL.createObjectURL(f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const scan = async () => {
    if (!file) return;
    setScanning(true);
    setProgress(0);
    try {
      const txt = await runOCR(file, setProgress);
      setText(txt);
      const detected = parseSalesText(txt, products);
      setEntries(detected);
      if (detected.length === 0) {
        toast.warning('No matches found', { description: 'Try a clearer image or edit the text below.' });
      } else {
        toast.success('Scan complete', { description: `${detected.length} entries detected.` });
      }
    } catch (err) {
      toast.error('OCR failed', { description: err.message });
    } finally {
      setScanning(false);
    }
  };

  const reparse = () => {
    if (!text.trim()) return;
    const detected = parseSalesText(text, products);
    setEntries(detected);
    toast.info('Re-parsed', { description: `${detected.length} entries.` });
  };

  const updateEntry = (idx, patch) => {
    setEntries(es => es.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const removeEntry = (idx) => {
    setEntries(es => {
      const removed = es[idx];
      const next = es.filter((_, i) => i !== idx);
      // If the combo just lost its last item, clean up its bundle data too.
      if (removed?.combo_id && !next.some(e => e.combo_id === removed.combo_id)) {
        setCombos(cs => {
          const c = { ...cs };
          delete c[removed.combo_id];
          return c;
        });
      }
      return next;
    });
  };

  const addEntry = () => setEntries(es => [...es, { product_id: '', quantity: 1, unit_price: 0 }]);

  /**
   * Add a sibling item to the same combo bundle.
   * Generates combo_id on first add and seeds the bundle price from the
   * source row's current line total so the user has a sensible starting point.
   */
  const addComboItem = (idx) => {
    setEntries(es => {
      const source = es[idx];
      const isFirstAdd = !source.combo_id;
      const combo_id = source.combo_id || `cb_${Math.random().toString(36).slice(2, 10)}`;
      const next = es.map((e, i) => (i === idx && !e.combo_id ? { ...e, combo_id } : e));
      const sibling = { product_id: '', quantity: 1, unit_price: undefined, combo_id };
      let insertAt = idx + 1;
      while (insertAt < next.length && next[insertAt].combo_id === combo_id) insertAt++;
      next.splice(insertAt, 0, sibling);

      if (isFirstAdd) {
        const product = products.find(p => p.id === source.product_id);
        const seed = Number(source.unit_price ?? product?.price ?? 0) * (Number(source.quantity) || 1);
        setCombos(cs => ({ ...cs, [combo_id]: { bundle_price: seed } }));
      }
      return next;
    });
  };

  /** Update the bundle price of a combo. */
  const setComboBundlePrice = (combo_id, value) => {
    const num = value === '' || value === null || value === undefined ? undefined : Number(value);
    setCombos(cs => ({ ...cs, [combo_id]: { ...cs[combo_id], bundle_price: num } }));
  };

  /** Strip combo_id from every entry in a combo and remove the combo data. */
  const dissolveCombo = (combo_id) => {
    setEntries(es => es.map(e => e.combo_id === combo_id ? { ...e, combo_id: undefined } : e));
    setCombos(cs => {
      const c = { ...cs };
      delete c[combo_id];
      return c;
    });
  };

  /** Group consecutive entries by combo_id for rendering. */
  const groups = useMemo(() => {
    const out = [];
    entries.forEach((entry, idx) => {
      const last = out[out.length - 1];
      if (entry.combo_id && last && last.combo_id === entry.combo_id) {
        last.items.push({ entry, idx });
      } else {
        out.push({ combo_id: entry.combo_id, items: [{ entry, idx }] });
      }
    });
    return out;
  }, [entries]);

  /** Total qty across all entries that belong to one combo. */
  const comboTotalQty = (combo_id) =>
    entries.filter(e => e.combo_id === combo_id).reduce((s, e) => s + (Number(e.quantity) || 0), 0);

  /**
   * Line total per entry — distributes combo bundle price proportionally to qty
   * when a combo bundle price is set, otherwise falls back to qty × unit_price.
   */
  const computeLineTotal = (entry) => {
    const bundle = entry.combo_id ? combos[entry.combo_id]?.bundle_price : undefined;
    if (entry.combo_id && bundle !== undefined) {
      const totalQty = comboTotalQty(entry.combo_id);
      if (totalQty <= 0) return 0;
      return bundle * ((Number(entry.quantity) || 0) / totalQty);
    }
    const product = products.find(p => p.id === entry.product_id);
    const price = Number(entry.unit_price ?? product?.price ?? 0);
    return price * (Number(entry.quantity) || 0);
  };

  const confirm = async () => {
    // Build the entries to send: distribute combo bundle prices proportionally
    // to qty so each saved sales row sums correctly to the bundle price.
    const final = entries.map(e => {
      if (e.combo_id && combos[e.combo_id]?.bundle_price !== undefined) {
        const totalQty = comboTotalQty(e.combo_id);
        const perUnit = totalQty > 0 ? combos[e.combo_id].bundle_price / totalQty : 0;
        return { ...e, unit_price: perUnit };
      }
      return e;
    });

    const valid = final.filter(e => e.product_id && Number(e.quantity) > 0);
    if (valid.length === 0) {
      toast.error('Nothing to save', { description: 'Pick at least one product.' });
      return;
    }
    await base44.utils.recordSales(valid, date, 'scan');
    toast.success('Sales saved', { description: `${valid.length} entries from scan.` });
    setEntries([]); setCombos({}); setText(''); setFile(null); setPreview('');
  };

  const totalValue = entries.reduce((sum, e) => sum + computeLineTotal(e), 0);

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
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3 w-3" /> AI-assisted entry
        </div>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Scan handwritten sales</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Upload a photo of a sales sheet or receipt. We'll OCR it, match products, and let you review before saving.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> 1. Upload image</CardTitle>
            <CardDescription>JPG, PNG, or screenshot. Good lighting helps.</CardDescription>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-input p-10 text-center transition hover:border-primary hover:bg-accent/40"
              >
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <div className="text-sm font-medium">Drop image or click to upload</div>
                <div className="mt-1 text-xs text-muted-foreground">Handwritten or printed text both work</div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
              </div>
            ) : (
              <div>
                <div className="relative max-h-80 overflow-hidden rounded-xl border bg-muted">
                  <img src={preview} alt="Preview" className="max-h-80 w-full object-contain" />
                  <button
                    onClick={() => { setPreview(''); setFile(null); setEntries([]); setText(''); }}
                    className="absolute right-2 top-2 rounded-md bg-black/60 p-2 text-white hover:bg-black/80 transition"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button onClick={scan} disabled={scanning}>
                    {scanning
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning… {progress}%</>
                      : <><ScanLine className="h-4 w-4" /> Run OCR scan</>}
                  </Button>
                  <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                    <RefreshCcw className="h-4 w-4" /> Change
                  </Button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
                </div>

                {scanning && (
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-primary/70 to-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            )}

            {text && (
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Extracted text</Label>
                  <button onClick={reparse} className="text-[11px] font-medium text-primary hover:underline">Re-parse</button>
                </div>
                <Textarea value={text} onChange={e => setText(e.target.value)} rows={6} className="font-mono text-xs" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> 2. Review & confirm</CardTitle>
            <CardDescription>
              {entries.length > 0 ? `${entries.length} detected entries` : 'Detected sales will appear here'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="py-10 text-center">
                <ScanLine className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Upload an image and run a scan.</p>
              </div>
            ) : (
              <>
                <div className="mb-5 max-w-xs space-y-1.5">
                  <Label>Sale date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>

                {/* Column headers */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit · AED</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-3">
                  {groups.map((group, gi) => {
                    const isCombo = group.combo_id && group.items.length > 1;

                    if (isCombo) {
                      const totalUnits = group.items.reduce((sum, { entry }) => sum + (Number(entry.quantity) || 0), 0);
                      const bundlePrice = combos[group.combo_id]?.bundle_price;
                      const subtotal = bundlePrice !== undefined
                        ? bundlePrice
                        : group.items.reduce((sum, { entry }) => sum + computeLineTotal(entry), 0);

                      return (
                        <div key={gi} className="overflow-hidden rounded-lg border-2 border-primary/20 bg-card">
                          <div className="flex items-center justify-between gap-2 border-b bg-primary/5 px-3 py-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                              <Layers className="h-3.5 w-3.5" /> Combo bundle · {group.items.length} items · {totalUnits} units
                            </span>
                            <button
                              type="button"
                              onClick={() => dissolveCombo(group.combo_id)}
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                              title="Break combo into separate rows"
                            >
                              <Unlink className="h-3 w-3" /> Dissolve
                            </button>
                          </div>
                          <div className="divide-y">
                            {group.items.map(({ entry, idx }) => (
                              <div key={idx} className="px-3 py-3">
                                <EntryRow
                                  entry={entry}
                                  idx={idx}
                                  products={products}
                                  inCombo
                                  bundleActive={bundlePrice !== undefined}
                                  distributedTotal={computeLineTotal(entry)}
                                  updateEntry={updateEntry}
                                  removeEntry={removeEntry}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-accent/30 px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`bp-${group.combo_id}`} className="text-xs whitespace-nowrap">
                                Bundle price (AED)
                              </Label>
                              <Input
                                id={`bp-${group.combo_id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={bundlePrice ?? ''}
                                placeholder="e.g. 99"
                                onChange={ev => setComboBundlePrice(group.combo_id, ev.target.value)}
                                className="h-9 w-28 text-right"
                              />
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Combo total</div>
                              <div className="font-heading text-lg font-bold text-primary tabular-nums">{fmtAED(subtotal)}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t px-3 py-2">
                            <button
                              type="button"
                              onClick={() => addComboItem(group.items[group.items.length - 1].idx)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add another item
                            </button>
                            <span className="text-[11px] text-muted-foreground">
                              {bundlePrice !== undefined
                                ? `Stock deducted per item · revenue ${fmtAED(subtotal)} split by qty`
                                : 'Set a bundle price to share across all items'}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Standalone (or 1-item combo — render as standalone with combo button)
                    const { entry, idx } = group.items[0];
                    return (
                      <div key={gi} className="rounded-lg border bg-card p-3">
                        <EntryRow
                          entry={entry}
                          idx={idx}
                          products={products}
                          updateEntry={updateEntry}
                          removeEntry={removeEntry}
                          onAddCombo={() => addComboItem(idx)}
                        />
                      </div>
                    );
                  })}
                </div>

                <Button type="button" variant="ghost" onClick={addEntry} className="mt-3">
                  <Plus className="h-4 w-4" /> Add row
                </Button>

                <div className="mt-5 flex items-center justify-between rounded-lg border bg-accent px-4 py-3">
                  <span className="text-sm font-medium text-accent-foreground">Estimated total</span>
                  <span className="font-heading text-xl font-bold text-primary">{fmtAED(totalValue)}</span>
                </div>

                <Button onClick={confirm} className="mt-4 w-full">
                  <Check className="h-4 w-4" /> Confirm & save sales
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * A single entry row (used both standalone and inside a combo bundle).
 */
function EntryRow({
  entry, idx, products, inCombo, bundleActive, distributedTotal,
  updateEntry, removeEntry, onAddCombo
}) {
  const product = products.find(p => p.id === entry.product_id);
  const catalogPrice = product?.price ?? 0;
  const unitPrice = Number(entry.unit_price ?? catalogPrice);
  const isOverridden = !inCombo && product && entry.unit_price !== undefined && unitPrice !== catalogPrice;
  const lineTotal = bundleActive
    ? (distributedTotal ?? 0)
    : unitPrice * (Number(entry.quantity) || 0);

  return (
    <>
      <div className="grid grid-cols-12 items-center gap-2">
        {/* Product */}
        <div className={inCombo ? 'col-span-12 sm:col-span-7' : 'col-span-12 sm:col-span-5'}>
          <Select
            value={entry.product_id}
            onValueChange={(v) => {
              const newP = products.find(p => p.id === v);
              updateEntry(idx, {
                product_id: v,
                product_name: newP?.name,
                sku: newP?.sku,
                unit_price: newP?.price
              });
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Qty */}
        <div className="col-span-4 sm:col-span-2">
          <Input
            type="number"
            min="1"
            value={entry.quantity}
            onChange={ev => updateEntry(idx, { quantity: Number(ev.target.value) })}
            className="text-center"
            aria-label="Quantity"
          />
        </div>

        {/* Unit price (only outside combo) */}
        {!inCombo && (
          <div className="col-span-4 sm:col-span-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={entry.unit_price ?? ''}
              placeholder={catalogPrice ? String(catalogPrice) : '0'}
              onChange={ev => updateEntry(idx, {
                unit_price: ev.target.value === '' ? undefined : Number(ev.target.value)
              })}
              className="text-right"
              aria-label="Unit price"
            />
          </div>
        )}

        {/* Line total */}
        <div className={`${inCombo ? 'col-span-7 sm:col-span-2' : 'col-span-3 sm:col-span-2'} text-right text-sm font-bold tabular-nums`}>
          {fmtAED(lineTotal)}
        </div>

        {/* Delete */}
        <button
          onClick={() => removeEntry(idx)}
          className="col-span-1 justify-self-end p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive rounded-md"
          aria-label={inCombo ? 'Remove combo item' : 'Remove row'}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Footer row: custom-price pill, raw OCR line, "+ Add to combo" */}
      {(isOverridden || entry.raw_line || onAddCombo) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          {onAddCombo && (
            <button
              type="button"
              onClick={onAddCombo}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-semibold text-primary transition hover:bg-primary/10"
            >
              <Layers className="h-3 w-3" /> Add to combo
            </button>
          )}
          {isOverridden && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground">
              Custom · catalog {fmtAED(catalogPrice)}
              <button
                type="button"
                onClick={() => updateEntry(idx, { unit_price: catalogPrice })}
                className="ml-0.5 underline-offset-2 hover:underline"
              >
                reset
              </button>
            </span>
          )}
          {entry.raw_line && (
            <span className="truncate font-mono text-muted-foreground">
              From: "{entry.raw_line}"
            </span>
          )}
        </div>
      )}
    </>
  );
}
