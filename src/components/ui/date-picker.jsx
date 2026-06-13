import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Themed date picker. Drop-in replacement for <input type="date">.
 *   <DatePicker value={iso} onChange={setIso} />
 * value / onChange use "YYYY-MM-DD" strings (empty string = no date).
 */
export function DatePicker({ value, onChange, placeholder = 'Pick a date', id, className, disabled }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value ? moment(value, 'YYYY-MM-DD') : moment()).startOf('month'));
  const wrapRef = useRef(null);

  const selected = value ? moment(value, 'YYYY-MM-DD') : null;
  const today = moment().format('YYYY-MM-DD');

  // Re-center the view on the selected month whenever the picker opens.
  useEffect(() => {
    if (open) setView((value ? moment(value, 'YYYY-MM-DD') : moment()).startOf('month'));
  }, [open, value]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const start = view.clone().startOf('month').startOf('week'); // Sunday-first
    return Array.from({ length: 42 }, (_, i) => start.clone().add(i, 'days'));
  }, [view]);

  const pick = (d) => { onChange?.(d.format('YYYY-MM-DD')); setOpen(false); };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 hover:border-accent transition-colors',
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn('flex-1 text-left', !selected && 'text-muted-foreground')}>
          {selected ? selected.format('MMM D, YYYY') : placeholder}
        </span>
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange?.(''); }}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setView(v => v.clone().subtract(1, 'month'))}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="font-heading text-sm font-semibold">{view.format('MMMM YYYY')}</div>
            <button type="button" onClick={() => setView(v => v.clone().add(1, 'month'))}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="grid h-8 place-items-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = d.format('YYYY-MM-DD');
              const inMonth = d.month() === view.month();
              const isSelected = selected && iso === selected.format('YYYY-MM-DD');
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => pick(d)}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-md text-sm transition-colors',
                    !inMonth && 'text-muted-foreground/40',
                    inMonth && !isSelected && 'text-foreground hover:bg-accent',
                    isToday && !isSelected && 'font-semibold text-primary ring-1 ring-primary/40',
                    isSelected && 'bg-primary font-semibold text-primary-foreground hover:bg-primary'
                  )}
                >
                  {d.date()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button type="button" onClick={() => { onChange?.(''); setOpen(false); }}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
            <button type="button" onClick={() => pick(moment())}
              className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
