'use client';
import React from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import { NotemindMark } from '@/components/ui/notemind-mark';

const NAV_LINKS = [
  { label: 'Features',     href: '#features'     },
  { label: 'Pricing',      href: '#pricing'      },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Blog',         href: '#'             },
];

// Use 24px threshold so top-6 (24px) sticky is already satisfied when the
// pill kicks in — avoids the element briefly losing its sticky anchor.
const SCROLL_THRESHOLD = 30;

export function Header() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(SCROLL_THRESHOLD);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    /*
     * Outer <header>: FIXED so the hero fills the full viewport behind it.
     * The pill always floats at top-4 (16px gap) — the hero background is
     * visible above it, exactly like the Trelium reference.
     *
     * Not scrolled → max-w-6xl  (wide, matches page content alignment)
     * Scrolled     → max-w-4xl  (narrows into a compact glass pill)
     *
     * 600ms deceleration curve keeps the size change smooth.
     */
    <header
      className={cn(
        'fixed inset-x-0 top-4 z-50 mx-auto',
        'bg-[#0d1520]',
        'transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        scrolled && !open
          ? [
              'max-w-4xl rounded-2xl',
              'border border-white/[0.12]',
              'bg-[#0d1520]/85 backdrop-blur-xl',
              'shadow-[0_8px_40px_rgba(0,0,0,0.45)]',
            ]
          : [
              'max-w-6xl rounded-2xl',
              'border border-white/[0.07]',
            ],
      )}
    >
      {/* Nav bar */}
      <nav
        className={cn(
          'relative flex w-full items-center justify-between',
          'transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          scrolled && !open ? 'h-14 px-5' : 'h-[68px] px-6',
        )}
      >
        {/* Logo + wordmark — white mark on the always-dark nav */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <NotemindMark className="h-7 w-auto text-white" />
          <span className="font-serif text-white text-[22px] tracking-tight">Notemind</span>
        </Link>

        {/* Desktop center links — absolute so they never push CTAs off-axis */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'text-white/65 hover:text-white hover:bg-white/10 text-[14px]',
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
              'text-white/65 hover:text-white hover:bg-white/10 text-[14px]',
            )}
          >
            Get Started
          </Link>
          <a
            href="https://cal.com/dsayandeep/notemind-demo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white hover:bg-white/90 text-[#0d1520] text-[14px] font-semibold px-5 py-2 rounded-full transition-colors shadow-sm"
          >
            Book a Call
          </a>
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

      {/* Mobile drawer — grid-rows trick for smooth height animation */}
      <div
        className={cn(
          'grid md:hidden',
          'transition-all duration-[500ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/[0.08] flex flex-col justify-between gap-y-2 px-5 pb-6 pt-3">
            <div className="grid gap-y-1">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    'justify-start text-white/80 hover:text-white hover:bg-white/10 text-[17px] h-12',
                  )}
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-2.5 mt-4">
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'w-full border-white/20 text-white hover:bg-white/10 hover:text-white',
                )}
              >
                Get Started
              </Link>
              <a
                href="https://cal.com/dsayandeep/notemind-demo"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full text-center py-3 bg-white text-[#0d1520] rounded-full font-semibold text-[15px]"
              >
                Book a Call
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
