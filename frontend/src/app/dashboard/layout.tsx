"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Video, Settings, Search, Bell, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{name: string, email: string, avatar_url: string} | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("notemind_token");
    const userStr = localStorage.getItem("notemind_user");
    if (!token || !userStr) {
      router.push("/auth");
      return;
    }
    setUser(JSON.parse(userStr));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("notemind_token");
    localStorage.removeItem("notemind_user");
    router.push("/auth");
  };

  if (!user) return null; // Or a loader

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Meetings", href: "/dashboard#meetings", icon: Video },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#050508] text-[#f8f8fa] overflow-hidden">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0a0a0f] border-r border-[#222230] 
        flex flex-col transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-[#222230] justify-between lg:justify-start">
          <Link href="/dashboard" className="flex items-center gap-2 text-[#6366f1] font-bold text-xl tracking-tight">
            <div className="w-6 h-6 rounded bg-[#6366f1] text-white flex items-center justify-center text-[10px]">◈</div>
            Notemind
          </Link>
          <button className="lg:hidden text-[#8b8b9f]" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/dashboard");
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? "bg-[rgba(99,102,241,0.1)] text-[#6366f1]" 
                    : "text-[#8b8b9f] hover:text-[#f8f8fa] hover:bg-[#121218]"}
                `}
              >
                <Icon size={18} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#222230]">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#121218] transition-colors cursor-pointer">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#a855f7] flex items-center justify-center text-white font-bold text-xs">
                {user.name?.charAt(0) || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#f8f8fa] truncate">{user.name}</p>
              <p className="text-xs text-[#8b8b9f] truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="mt-2 w-full text-left text-xs text-[#8b8b9f] hover:text-[#ef4444] px-2 py-1 transition-colors font-medium"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-[#222230] bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-[#8b8b9f]" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#121218] border border-[#222230] rounded-lg w-64 focus-within:border-[#6366f1] focus-within:ring-1 focus-within:ring-[#6366f1]/20 transition-all">
              <Search size={16} className="text-[#8b8b9f]" />
              <input 
                type="text" 
                placeholder="Search meetings..." 
                className="bg-transparent border-none text-sm text-[#f8f8fa] placeholder-[#8b8b9f] focus:outline-none w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[#8b8b9f] hover:text-[#f8f8fa] transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#ef4444]"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
