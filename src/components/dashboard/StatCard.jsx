import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Accent palettes — literal class strings so Tailwind's JIT keeps them.
const ACCENTS = {
  primary: { chip: 'bg-primary/10 text-primary',         glow: 'bg-primary/20' },
  emerald: { chip: 'bg-emerald-500/10 text-emerald-600', glow: 'bg-emerald-500/20' },
  blue:    { chip: 'bg-blue-500/10 text-blue-600',       glow: 'bg-blue-500/20' },
  violet:  { chip: 'bg-violet-500/10 text-violet-600',   glow: 'bg-violet-500/20' },
  amber:   { chip: 'bg-amber-500/10 text-amber-600',     glow: 'bg-amber-500/20' },
  rose:    { chip: 'bg-rose-500/10 text-rose-600',       glow: 'bg-rose-500/20' }
};

export default function StatCard({ title, value, icon: Icon, trend, trendValue, subtitle, accent = 'primary', className }) {
  const positive = trend === 'up';
  const a = ACCENTS[accent] || ACCENTS.primary;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
    >
      {/* soft colored glow in the corner */}
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-70 transition-opacity group-hover:opacity-100', a.glow)} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
          <div className="mt-2 font-heading text-2xl lg:text-[1.75rem] font-bold leading-none tracking-tight">{value}</div>
        </div>
        {Icon && (
          <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-transform group-hover:scale-105', a.chip)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(trendValue || subtitle) && (
        <div className="relative mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          {trendValue && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}>
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendValue}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
