import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell, Boxes, Camera, ChevronLeft, ChevronRight, FileBarChart2,
  LayoutGrid, LogOut, Moon, Package, Settings as SettingsIcon,
  ShoppingCart, Sun, Undo2, User, X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationsContext';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/',              label: 'Dashboard',     icon: LayoutGrid,    end: true },
  { to: '/products',      label: 'Products',      icon: Package },
  { to: '/sales',         label: 'Sales',         icon: ShoppingCart },
  { to: '/returns',       label: 'Returns',       icon: Undo2 },
  { to: '/stock',         label: 'Stock Balance', icon: Boxes },
  { to: '/reports',       label: 'Reports',       icon: FileBarChart2 },
  { to: '/scan',          label: 'AI Scan',       icon: Camera },
  { to: '/notifications', label: 'Notifications', icon: Bell, withBadge: true },
  { to: '/settings',      label: 'Settings',      icon: SettingsIcon }
];

export default function Sidebar({ open, onClose }) {
  const [expanded, setExpanded] = useState(() => localStorage.getItem('rozes_ui.sidebarExpanded') === '1');
  const [hovered, setHovered] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { unread } = useNotifications();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Visually expanded when pinned open OR while the mouse is hovering the rail.
  const showExpanded = expanded || hovered;

  useEffect(() => {
    localStorage.setItem('rozes_ui.sidebarExpanded', expanded ? '1' : '0');
  }, [expanded]);

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const width = showExpanded ? 'w-60' : 'w-[72px]';

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setProfileOpen(false); }}
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 flex h-screen flex-col border-r bg-card transition-[width,transform] duration-300 lg:translate-x-0',
          width,
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        {/* Top: avatar + close on mobile */}
        <div className={cn('flex items-center justify-between p-3', showExpanded ? 'px-4' : 'px-3')}>
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-sm transition hover:opacity-90"
              aria-label="Profile menu"
            >
              {(user?.name || 'A').slice(0, 1).toUpperCase()}
            </button>
            {profileOpen && (
              <div className="absolute left-full top-0 z-50 ml-2 w-56 origin-top-left animate-scale-in rounded-xl border bg-popover py-1.5 shadow-lg">
                <div className="border-b px-3 py-2">
                  <div className="text-sm font-semibold">{user?.name}</div>
                  <div className="text-[11px] text-muted-foreground">{user?.email}</div>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); navigate('/settings'); onClose?.(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition"
                >
                  <User className="h-4 w-4" /> Profile & Settings
                </button>
                <button
                  onClick={() => { setProfileOpen(false); logout(); navigate('/login'); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>

          {showExpanded && (
            <div className="ml-3 flex-1 leading-tight">
              <div className="text-sm font-bold">Rozes</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Skincare</div>
            </div>
          )}

          <button
            onClick={onClose}
            className="lg:hidden text-muted-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex-1 overflow-y-auto px-2">
          <ul className="space-y-1.5">
            {NAV.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => onClose?.()}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center rounded-xl text-sm font-medium transition-all',
                        showExpanded ? 'gap-3 px-3 py-2.5' : 'h-11 w-12 mx-auto justify-center',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="relative">
                          <Icon className={cn('h-5 w-5 transition', isActive && 'scale-105')} />
                          {item.withBadge && unread > 0 && (
                            <span className={cn(
                              'absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-card',
                              isActive && 'bg-white text-primary ring-primary'
                            )}>
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </span>
                        {showExpanded && <span>{item.label}</span>}
                        {!showExpanded && (
                          <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md group-hover:block z-50 border">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: theme toggle + collapse arrow */}
        <div className={cn('border-t p-2 space-y-1', showExpanded && 'px-3')}>
          <button
            onClick={toggle}
            className={cn(
              'group relative flex items-center rounded-xl text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground',
              showExpanded ? 'w-full gap-3 px-3 py-2.5' : 'h-11 w-12 mx-auto justify-center'
            )}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {showExpanded && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
            {!showExpanded && (
              <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md group-hover:block z-50 border">
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </span>
            )}
          </button>

          <button
            onClick={() => setExpanded(e => !e)}
            className={cn(
              'flex items-center rounded-xl text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground',
              showExpanded ? 'w-full gap-3 px-3 py-2.5' : 'h-11 w-12 mx-auto justify-center'
            )}
            aria-label={expanded ? 'Unpin sidebar' : 'Keep sidebar open'}
          >
            {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            {showExpanded && <span>{expanded ? 'Collapse' : 'Keep open'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
