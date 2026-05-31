'use client';
import React from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';

function NavLogo() {
  const bars = [7, 13, 9, 15];
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-brand">
      <div className="flex items-end gap-[2.5px]">
        {bars.map((h, i) => (
          <div key={i} className="w-[3px] rounded-[1.5px] bg-white" style={{ height: `${h}px` }} />
        ))}
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing',  href: '#pricing'  },
  { label: 'About',    href: '#faq'      },
];

export function Header() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 mx-auto w-full border-b border-transparent md:transition-all md:ease-out',
        scrolled && !open && [
          'bg-[#0d1520]/90 border-white/[0.08] backdrop-blur-lg',
          'md:top-4 md:max-w-4xl md:rounded-2xl md:shadow-2xl',
        ],
        open && 'bg-[#0d1520]/95',
      )}
    >
      <nav
        className={cn(
          'flex h-[68px] w-full items-center justify-between px-6 lg:px-8 md:transition-all md:ease-out',
          scrolled && !open && 'md:h-14 md:px-5',
        )}
      >
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <NavLogo />
          <span className="font-serif text-white text-[22px] tracking-tight">Notemind</span>
        </Link>

        {/* Desktop center links */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'text-white/70 hover:text-white hover:bg-white/10 text-[14px]',
              )}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <Link
            href="/auth"
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'text-white/70 hover:text-white hover:bg-white/10 text-[14px]',
            )}
          >
            Sign In
          </Link>
          <Link
            href="/auth"
            className="flex items-center gap-1.5 bg-white hover:bg-white/90 text-[#0d1520] text-[14px] font-semibold px-5 py-2 rounded-full transition-all shadow-sm"
          >
            Start for free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden ml-auto p-2 text-white"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </button>
      </nav>

      {/* Mobile drawer — full-screen, fades in/out */}
      <div
        className={cn(
          'fixed top-[68px] right-0 bottom-0 left-0 z-50 bg-[#0d1520]/98 border-t border-white/[0.08] flex flex-col md:hidden transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="flex h-full flex-col justify-between p-6">
          <div className="grid gap-y-1 mt-2">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'justify-start text-white/80 hover:text-white hover:bg-white/10 text-[18px] h-12',
                )}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/auth"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full border-white/20 text-white hover:bg-white/10 hover:text-white',
              )}
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              onClick={() => setOpen(false)}
              className="w-full text-center py-3 bg-white text-[#0d1520] rounded-full font-semibold text-[15px]"
            >
              Start for free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
