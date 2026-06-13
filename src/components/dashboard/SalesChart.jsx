import { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtAED } from '@/utils/format';
import { cn } from '@/lib/utils';

export default function SalesChart({ data, title = 'Revenue' }) {
  const [view, setView] = useState('area');
  const hasData = data.some(d => (d.revenue || 0) > 0);

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload || {};
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
        <div className="text-muted-foreground">{label}</div>
        <div className="mt-0.5 font-semibold text-primary">{fmtAED(payload[0].value)}</div>
        {p.units != null && <div className="mt-0.5 text-muted-foreground">{p.units.toLocaleString()} units</div>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>{title}</CardTitle>
        <div className="inline-flex items-center rounded-full border bg-muted/40 p-0.5">
          <ToggleBtn active={view === 'area'} onClick={() => setView('area')}>Area</ToggleBtn>
          <ToggleBtn active={view === 'bar'} onClick={() => setView('bar')}>Bar</ToggleBtn>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-72">
          {!hasData && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <LineChartIcon className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium text-foreground">No revenue to show</div>
              <div className="text-xs text-muted-foreground">Record a sale and it'll appear here.</div>
            </div>
          )}
          <div className={cn('h-full transition-opacity', !hasData && 'opacity-30')}>
          <ResponsiveContainer>
            {view === 'area' ? (
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#grad-revenue)"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={i === data.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.55)'} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1 text-xs font-semibold transition',
        active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
