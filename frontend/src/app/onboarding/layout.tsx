import Link from 'next/link';
import { Mic } from 'lucide-react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center px-6 lg:px-12 border-b border-gray-100 bg-white">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <Mic size={13} className="text-white" />
          </div>
          <span className="font-serif text-ink text-[18px] tracking-tight">Notemind</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
          {/* Subtle green glow */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(26,107,60,0.06), transparent 70%)', transform: 'translate(30%, -30%)' }}
          />
          {children}
        </div>
      </main>
    </div>
  );
}
