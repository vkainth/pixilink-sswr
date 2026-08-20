import localFont from 'next/font/local'

/**
 * Playfair Display — latin subset (woff2 variable font), full 400–900 axis.
 *
 * Google Fonts serves the identical woff2 file for every requested weight
 * because Playfair Display v40 is a variable font that covers the full
 * 400–900 axis. We bundle the latin subset so Docker builds never need to
 * reach fonts.gstatic.com. Add new scripts (cyrillic etc.) by downloading
 * the corresponding file from fonts.gstatic.com and adding another src entry.
 *
 * Do NOT use `next/font/google` anywhere in this project — the Docker build
 * environment has no outbound access to Google's CDN during `next build`.
 * Always import { playfair } from '@/lib/fonts' instead.
 */
export const playfair = localFont({
  // One variable file, full axis — declaring discrete weights instead would make
  // fontWeight 800/900 synthesize a fake bold rather than use the real axis.
  src: [{ path: '../fonts/playfair-latin.woff2', style: 'normal' }],
  weight: '400 900',
  display: 'swap',
  // Exposed as a CSS variable so inline style objects can reference the font
  // without importing the module. next/font generates a hashed family name, so
  // writing fontFamily: "'Playfair Display',..." by hand silently falls through
  // to the Georgia fallback - use var(--font-display) instead.
  variable: '--font-display',
})

/**
 * Inter — latin subset (woff2 variable font), full 100–900 axis.
 *
 * Inter v20 is a variable font, so one latin file covers every weight.
 *
 * Exposed as --font-body. Note this is NOT wired into --font-sans (globals.css),
 * which is intentionally a system stack — Inter applies only where a surface
 * explicitly asks for it, and to the `all-sans` font pair.
 */
export const inter = localFont({
  src: [{ path: '../fonts/inter-latin.woff2', style: 'normal' }],
  weight: '100 900',
  display: 'swap',
  variable: '--font-body',
})
