import localFont from 'next/font/local'

/**
 * Playfair Display — latin subset (woff2 variable font), weights 400–700.
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
  src: [
    { path: '../fonts/playfair-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/playfair-latin.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/playfair-latin.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
})
