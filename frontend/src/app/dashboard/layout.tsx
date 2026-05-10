'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  Brain,
  LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { clearSession, getStoredUser } from '@/lib/api';
import type { User } from '@/types/api';

interface NavLink {
  name: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { name: 'Meetings', href: '/dashboard#meetings', icon: Video },
  { name: 'Search', href: '/dashboard/search', icon: Search },
  { name: 'AI Memory', href: '/dashboard/memory', icon: Brain },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
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

  const handleLogout = () => {
    clearSession();
    router.push('/auth');
  };

  if (!user) return null;

  const isActive = (link: NavLink) => {
    if (link.exact) return pathname === link.href;
    return pathname.startsWith(link.href.split('#')[0]) && link.href !== '/dashboard';
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[220px] bg-surface-2 border-r border-border
          flex flex-col transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-border gap-2 justify-between lg:justify-start shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-foreground font-bold text-base tracking-tight"
          >
            <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center text-[9px] text-white">
              ◈
            </div>
            Notemind
          </Link>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(link => {
            const Icon = link.icon;
            const active = isActive(link);
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-3'
                  }
                `}
              >
                <Icon size={16} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                {user.name?.charAt(0) ?? 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-red-400 rounded-lg transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-surface-2/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            {/* Global search trigger */}
            <Link
              href="/dashboard/search"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg w-52 text-sm text-muted-foreground hover:border-accent/40 hover:text-foreground transition-colors"
            >
              <Search size={14} />
              <span className="flex-1">Search…</span>
              <kbd className="text-[10px] font-mono bg-surface-3 px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
