import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, icon: Icon, trend, trendValue, subtitle, className }) {
  const positive = trend === 'up';
  return (
    <Card className={cn('p-5 transition-all hover:shadow-md', className)}>
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        {trendValue && (
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold',
            positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          )}>
            {positive
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />}
            {trendValue}
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="font-heading text-2xl lg:text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-muted-foreground/80">{subtitle}</div>
        )}
      </div>
    </Card>
  );
}
