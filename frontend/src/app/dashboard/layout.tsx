'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  Settings,
  Search,
  Menu,
  X,
  Brain,
  LogOut,
  CalendarDays,
  Upload,
  FolderOpen,
  Zap,
  Bell,
  Mic,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { clearSession, getStoredUser } from '@/lib/api';
import { NotificationsProvider } from '@/lib/notifications';
import { NotificationsPanel } from '@/components/ui/NotificationsPanel';
import type { User } from '@/types/api';

// ── Nav structure ─────────────────────────────────────────────

interface NavLink {
  name: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
}

interface NavSection {
  label?: string;
  links: NavLink[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    links: [
      { name: 'Home',     href: '/dashboard',          icon: LayoutDashboard, exact: true },
      { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
      { name: 'Search',   href: '/dashboard/search',   icon: Search },
    ],
  },
  {
    label: 'Workspace',
    links: [
      { name: 'Meetings', href: '/dashboard#meetings', icon: Video },
      { name: 'Folders',  href: '/dashboard/folders',  icon: FolderOpen },
    ],
  },
  {
    label: 'Tools',
    links: [
      { name: 'AI Memory',    href: '/dashboard/memory',      icon: Brain },
      { name: 'Automations',  href: '/dashboard/automations', icon: Zap },
      { name: 'Upload',       href: '/dashboard/upload',      icon: Upload },
    ],
  },
];

const BOTTOM_LINKS: NavLink[] = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// ── Sidebar ───────────────────────────────────────────────────

function Sidebar({ user, onClose }: { user: User; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (link: NavLink) => {
    if (link.exact) return pathname === link.href;
    const base = link.href.split('#')[0];
    return base !== '/dashboard' && pathname.startsWith(base);
  };

  const handleLogout = () => {
    clearSession();
    router.push('/auth');
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-100 justify-between shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
            <Mic size={13} className="text-white" />
          </div>
          <span className="text-gray-900 font-bold text-[17px] tracking-tight">Notemind</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Workspace selector */}
      <div className="px-3 py-3 border-b border-gray-100 shrink-0">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
          <span className="text-sm font-medium text-gray-700 truncate">My Workspace</span>
          <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 shrink-0" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.links.map(link => {
                const Icon = link.icon;
                const active = isActive(link);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={onClose}
                    className={`
                      relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active
                        ? 'bg-green-50 text-green-700 border-l-[3px] border-green-600 pl-[9px]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon size={17} />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-gray-100 p-3 space-y-0.5">
        {BOTTOM_LINKS.map(link => {
          const Icon = link.icon;
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-green-50 text-green-700 border-l-[3px] border-green-600 pl-[9px]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <Icon size={17} />
              {link.name}
            </Link>
          );
        })}

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {user.name?.charAt(0) ?? 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser || !localStorage.getItem('notemind_token')) {
      router.push('/auth');
      return;
    }
    setUser(storedUser);
  }, [router]);

  // Page title from pathname
  const pageTitle = (() => {
    if (pathname === '/dashboard') return 'Home';
    if (pathname.startsWith('/dashboard/meetings/')) return 'Meeting';
    const seg = pathname.split('/').pop() ?? '';
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  })();

  if (!user) return null;

  return (
    <NotificationsProvider>
      <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[240px] shrink-0
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar user={user} onClose={() => setMobileOpen(false)} />
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">

          {/* Topbar */}
          <header className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={20} />
              </button>

              {/* Page title (desktop) */}
              <h1 className="hidden lg:block text-base font-semibold text-gray-900">{pageTitle}</h1>

              {/* Search */}
              <Link
                href="/dashboard/search"
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg w-64 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <Search size={14} />
                <span className="flex-1">Search meetings...</span>
                <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-400">⌘K</kbd>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <NotificationsPanel />
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name?.charAt(0) ?? 'U'}
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </NotificationsProvider>
  );
}
