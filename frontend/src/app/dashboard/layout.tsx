'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Video, Settings, Search, Menu, X,
  Brain, LogOut, CalendarDays, Upload, FolderOpen, Zap,
  Mic, ChevronDown, Building, Plus, Check,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { clearSession, getStoredUser } from '@/lib/api';
import { NotificationsProvider } from '@/lib/notifications';
import { NotificationsPanel } from '@/components/ui/NotificationsPanel';
import type { User } from '@/types/api';

// ── Nav structure ─────────────────────────────────────────────

interface NavLink { name: string; href: string; icon: React.ElementType; exact?: boolean; }
interface NavSection { label?: string; links: NavLink[]; }

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
      { name: 'Folders',   href: '/dashboard/folders', icon: FolderOpen },
    ],
  },
  {
    label: 'Tools',
    links: [
      { name: 'AI Memory',   href: '/dashboard/memory',      icon: Brain },
      { name: 'Automations', href: '/dashboard/automations', icon: Zap },
      { name: 'Upload',      href: '/dashboard/upload',      icon: Upload },
    ],
  },
];

const BOTTOM_LINKS: NavLink[] = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// ── Workspace Dropdown ────────────────────────────────────────

function WorkspaceSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [wsName, setWsName] = useState('My Workspace');

  useEffect(() => {
    const raw = localStorage.getItem('notemind_workspace');
    if (raw) {
      try { setWsName(JSON.parse(raw).name || 'My Workspace'); } catch { /* */ }
    }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative px-3 py-3 border-b border-gray-100 shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-off-white transition-colors group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-brand-light flex items-center justify-center shrink-0">
            <Building size={11} className="text-brand" />
          </div>
          <span className="text-[13px] font-medium text-ink-2 truncate">{wsName}</span>
        </div>
        <ChevronDown size={13} className={`text-ink-5 group-hover:text-ink-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-[calc(100%-8px)] z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden py-1">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider">Workspace</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-off-white transition-colors text-left"
          >
            <div className="w-5 h-5 rounded bg-brand flex items-center justify-center shrink-0">
              <Building size={11} className="text-white" />
            </div>
            <span className="text-[13px] font-medium text-ink flex-1 truncate">{wsName}</span>
            <Check size={12} className="text-brand shrink-0" />
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-off-white transition-colors text-left text-ink-4 hover:text-ink-2"
          >
            <Plus size={13} />
            <span className="text-[13px]">Create workspace</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────

function Avatar({ user, size = 'sm' }: { user: User; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs';
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={user.name} className={`${dim} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-brand flex items-center justify-center font-bold text-white shrink-0`}>
      {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
    </div>
  );
}

// ── Command Palette ───────────────────────────────────────────

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const QUICK_LINKS = [
    { label: 'Go to Search', href: '/dashboard/search', icon: Search },
    { label: 'Upload Recording', href: '/dashboard/upload', icon: Upload },
    { label: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
    { label: 'AI Memory', href: '/dashboard/memory', icon: Brain },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const filtered = query
    ? QUICK_LINKS.filter(l => l.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_LINKS;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <Search size={16} className="text-ink-4 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages or type a command..."
            className="flex-1 text-[15px] text-ink placeholder:text-ink-5 focus:outline-none"
          />
          <kbd className="text-[11px] text-ink-5 border border-gray-200 rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="py-2 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-[13px] text-ink-5 py-8">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            filtered.map(link => {
              const Icon = link.icon;
              return (
                <button
                  key={link.href}
                  onClick={() => { router.push(link.href); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-off-white transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-brand" />
                  </div>
                  <span className="text-[14px] font-medium text-ink">{link.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────

function Sidebar({ user, onClose }: { user: User; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (link: NavLink) => {
    if (link.exact) return pathname === link.href;
    const base = link.href.split('#')[0];
    return base !== '/dashboard' && pathname.startsWith(base);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-100 justify-between shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center">
            <Mic size={12} className="text-white" />
          </div>
          <span className="font-serif text-ink text-[17px] tracking-tight">Notemind</span>
        </Link>
        {onClose && (
          <button aria-label="Close menu" onClick={onClose} className="p-1 text-ink-5 hover:text-ink-3 lg:hidden">
            <X size={17} />
          </button>
        )}
      </div>

      {/* Workspace selector */}
      <WorkspaceSelector />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5">
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
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      active
                        ? 'bg-brand-light text-brand border-l-[2px] border-brand pl-[10px]'
                        : 'text-ink-3 hover:text-ink hover:bg-off-white'
                    }`}
                  >
                    <Icon size={16} />
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-brand-light text-brand border-l-[2px] border-brand pl-[10px]'
                  : 'text-ink-3 hover:text-ink hover:bg-off-white'
              }`}
            >
              <Icon size={16} />
              {link.name}
            </Link>
          );
        })}

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <Avatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-ink truncate">{user.name}</p>
            <p className="text-[11px] text-ink-5 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { clearSession(); router.push('/auth'); }}
            aria-label="Sign out"
            className="p-1.5 text-ink-5 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser || !localStorage.getItem('notemind_token')) {
      router.push('/auth');
      return;
    }
    setUser(storedUser);
  }, [router]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const pageTitle = (() => {
    if (pathname === '/dashboard') return 'Home';
    if (pathname.startsWith('/dashboard/meetings/')) return 'Meeting';
    const seg = pathname.split('/').pop() ?? '';
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  })();

  if (!user) return null;

  return (
    <NotificationsProvider>
      <div className="flex h-screen bg-off-white text-ink overflow-hidden">

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
                aria-label="Open menu"
                className="lg:hidden p-2 text-ink-4 hover:text-ink-2 rounded-lg hover:bg-off-white"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={19} />
              </button>

              <h1 className="hidden lg:block text-[15px] font-semibold text-ink">{pageTitle}</h1>

              {/* Search bar (opens ⌘K palette) */}
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-off-white rounded-lg w-60 text-[13px] text-ink-5 hover:bg-gray-100 hover:text-ink-3 transition-colors border border-gray-100"
              >
                <Search size={13} />
                <span className="flex-1 text-left">Search meetings...</span>
                <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-ink-5">⌘K</kbd>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <NotificationsPanel />
              <Avatar user={user} size="md" />
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>

        {/* Command palette */}
        {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
      </div>
    </NotificationsProvider>
  );
}
