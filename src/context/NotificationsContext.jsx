import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const Ctx = createContext(null);

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await base44.entities.Notification.list('-created_date', 50);
    setItems(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('rozes:notifications-changed', handler);
    return () => window.removeEventListener('rozes:notifications-changed', handler);
  }, [refresh]);

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    setItems(rows => rows.map(r => r.id === id ? { ...r, read: true } : r));
  };

  const markAllRead = async () => {
    await Promise.all(items.filter(n => !n.read).map(n => base44.entities.Notification.update(n.id, { read: true })));
    setItems(rows => rows.map(r => ({ ...r, read: true })));
  };

  const remove = async (id) => {
    await base44.entities.Notification.delete(id);
    setItems(rows => rows.filter(r => r.id !== id));
  };

  const clearAll = async () => {
    await Promise.all(items.map(n => base44.entities.Notification.delete(n.id)));
    setItems([]);
  };

  const unread = items.filter(n => !n.read).length;

  return (
    <Ctx.Provider value={{ items, unread, loading, refresh, markRead, markAllRead, remove, clearAll }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotifications = () => useContext(Ctx);

export function emitNotificationChange() {
  window.dispatchEvent(new Event('rozes:notifications-changed'));
}
