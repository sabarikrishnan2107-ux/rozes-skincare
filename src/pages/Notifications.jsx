import { useNotifications } from '@/context/NotificationsContext';
import { Bell, BellOff, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import moment from 'moment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { items, loading, markRead, markAllRead, remove, clearAll, unread } = useNotifications();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} total · {unread} unread
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
          <Button variant="outline" onClick={clearAll} disabled={items.length === 0} className="text-destructive">
            <Trash2 className="h-4 w-4" /> Clear all
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <BellOff className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-heading text-lg">All caught up</h3>
            <p className="mt-1 text-sm text-muted-foreground">You don't have any notifications right now.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {items.map(n => {
              const critical = n.severity === 'critical';
              return (
                <li
                  key={n.id}
                  className={cn(
                    'flex items-start gap-4 p-4 transition-colors',
                    !n.read && 'bg-accent/30'
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    critical ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                  )}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {!n.read && <Badge variant="default" className="text-[10px]">New</Badge>}
                      <Badge variant={critical ? 'destructive' : 'warning'} className="text-[10px]">
                        {n.type === 'mismatch' ? 'Mismatch' : 'Stock'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {moment(n.created_date).fromNow()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        title="Mark read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => remove(n.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
