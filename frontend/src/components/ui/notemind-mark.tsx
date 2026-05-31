import React from 'react';

/**
 * Notemind "n" lettermark — geometric two-stroke logotype.
 *
 * Left stroke : tall quad with a diagonal right edge (top-right → lower-left).
 * Right stroke: same height with a perfect semicircular dome top.
 *
 * Uses fill="currentColor" so colour is driven by the nearest text-* class:
 *   text-white   → white mark (dark backgrounds: navbar, footer)
 *   text-brand   → blue mark  (light backgrounds: dashboard sidebar)
 *   text-[#0f172a] → near-black mark
 */
export function NotemindMark(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 62 50"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {/* Left stroke — quad: wide at top, diagonal cut tapers to bottom-right */}
      <path d="M0 0h32L17 50H0z" />
      {/*
        Right stroke — arch:
          · straight left edge from (31,50) up to (31,15.5)
          · clockwise semicircle (sweep=1) r=15.5 to (62,15.5) → peak at (46.5,0)
          · straight right edge down to (62,50)
      */}
      <path d="M31 50V15.5a15.5 15.5 0 0 1 31 0V50z" />
    </svg>
  );
}
