/**
 * shadcn-API-compatible Dialog without Radix dependency.
 * Provides Dialog, DialogContent, DialogHeader, DialogTitle,
 * DialogDescription, DialogFooter, DialogTrigger, DialogClose.
 */
import { createContext, useContext, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DialogCtx = createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogCtx.Provider value={{ open, onOpenChange }}>{children}</DialogCtx.Provider>
  );
}

export function DialogTrigger({ asChild, children, ...rest }) {
  const ctx = useContext(DialogCtx);
  const onClick = (e) => {
    children.props?.onClick?.(e);
    ctx.onOpenChange?.(true);
  };
  if (asChild) return <span onClick={onClick}>{children}</span>;
  return (
    <button type="button" onClick={onClick} {...rest}>
      {children}
    </button>
  );
}

export function DialogClose({ asChild, children, ...rest }) {
  const ctx = useContext(DialogCtx);
  const onClick = (e) => {
    children?.props?.onClick?.(e);
    ctx.onOpenChange?.(false);
  };
  if (asChild) return <span onClick={onClick}>{children}</span>;
  return <button type="button" onClick={onClick} {...rest}>{children}</button>;
}

export function DialogContent({ className, children, hideClose = false }) {
  const ctx = useContext(DialogCtx);

  useEffect(() => {
    if (!ctx.open) return;
    const onKey = e => { if (e.key === 'Escape') ctx.onOpenChange?.(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [ctx.open, ctx.onOpenChange]);

  if (!ctx.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => ctx.onOpenChange?.(false)}
      />
      <div
        role="dialog"
        className={cn(
          'relative z-10 grid w-full max-w-lg gap-4 border border-border/60 bg-card text-card-foreground p-6 shadow-2xl',
          'rounded-xl animate-scale-in max-h-[90vh] overflow-y-auto',
          'isolate',
          className
        )}
      >
        {children}
        {!hideClose && (
          <button
            type="button"
            onClick={() => ctx.onOpenChange?.(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />;
}
export function DialogFooter({ className, ...props }) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}
export function DialogTitle({ className, ...props }) {
  return <h2 className={cn('font-heading text-xl font-semibold leading-none tracking-tight', className)} {...props} />;
}
export function DialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
