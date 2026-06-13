/**
 * shadcn-API-compatible Select built on a hidden native <select> +
 * a styled custom dropdown. Avoids Radix UI dependency while keeping
 * the same import surface (Select, SelectTrigger, SelectValue,
 * SelectContent, SelectItem).
 */
import {
  cloneElement, createContext, isValidElement, useContext,
  useEffect, useMemo, useRef, useState
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SelectCtx = createContext(null);

export function Select({ value, defaultValue, onValueChange, disabled, children }) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const items = useRef(new Map());

  useEffect(() => {
    if (!open) return;
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const setValue = (v) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  };

  const registerItem = (val, label) => { items.current.set(val, label); };
  const labelFor = (val) => items.current.get(val);

  return (
    <SelectCtx.Provider value={{ open, setOpen, value: current, setValue, disabled, registerItem, labelFor, ref }}>
      <div ref={ref} className="relative">{children}</div>
    </SelectCtx.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const ctx = useContext(SelectCtx);
  return (
    <button
      type="button"
      onClick={() => !ctx.disabled && ctx.setOpen(o => !o)}
      disabled={ctx.disabled}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground ring-offset-background',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', ctx.open && 'rotate-180')} />
    </button>
  );
}

export function SelectValue({ placeholder, className }) {
  const ctx = useContext(SelectCtx);
  const display = ctx.value && ctx.labelFor(ctx.value);
  return (
    <span className={cn('truncate text-left', !display && 'text-muted-foreground', className)}>
      {display || placeholder}
    </span>
  );
}

export function SelectContent({ className, children }) {
  const ctx = useContext(SelectCtx);

  // Always register child items so labels are available for SelectValue
  const registered = useMemo(() => {
    const arr = [];
    const walk = (nodes) => {
      if (!nodes) return;
      const list = Array.isArray(nodes) ? nodes : [nodes];
      list.forEach(node => {
        if (!isValidElement(node)) return;
        if (node.props && node.props.value !== undefined) {
          arr.push({ value: node.props.value, label: node.props.children });
        }
        if (node.props && node.props.children) walk(node.props.children);
      });
    };
    walk(children);
    return arr;
  }, [children]);

  useEffect(() => {
    registered.forEach(({ value, label }) => ctx.registerItem(value, label));
  }, [registered, ctx]);

  if (!ctx.open) return null;

  return (
    <div
      className={cn(
        'absolute z-50 mt-1 max-h-72 w-full min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'animate-scale-in origin-top',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, className, children, disabled }) {
  const ctx = useContext(SelectCtx);
  const selected = ctx.value === value;
  return (
    <button
      type="button"
      role="option"
      disabled={disabled}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none',
        'hover:bg-accent hover:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        selected && 'bg-accent/60',
        className
      )}
    >
      {selected && (
        <Check className="absolute left-2 h-4 w-4 text-primary" />
      )}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function SelectGroup({ children }) { return <div role="group">{children}</div>; }
export function SelectLabel({ className, ...props }) {
  return <div className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...props} />;
}
export function SelectSeparator({ className }) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} />;
}
