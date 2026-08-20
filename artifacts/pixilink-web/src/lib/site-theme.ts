import type { AgentProfile } from './types'
import { hexToRgb, relativeLuminance, resolveSiteConfig, resolveTheme } from './types'

/**
 * Resolved surface palette for one agent site.
 *
 * Every value is a CSS colour, emitted as a --site-* custom property by the agent
 * layout so inline style objects can reference it without threading props through
 * eight files. Import resolveSiteTheme directly only where a raw value is genuinely
 * required — an SVG data URI cannot contain var().
 *
 * Why this exists: the showcase surfaces previously repeated the same three
 * constants (SC_CHARCOAL / SC_GOLD / SC_OFF_WHITE) in five separate files, plus a
 * parallel ternary map in about/page.tsx, so a palette change meant editing all of
 * them and the accent disagreed with the agent's actual brand colour. One resolver
 * makes a new look a token set rather than a code change.
 */
export interface SiteTheme {
  /** Page background. */
  canvas: string
  /** Raised card / panel background sitting on canvas. */
  surface: string
  /** Headings and other high-emphasis text. */
  ink: string
  /** Body copy. */
  body: string
  /** Secondary and supporting text. */
  muted: string
  /** Hairline borders and dividers. */
  rule: string
  /** Brand accent — rules, small marks, and fills on dark backgrounds. */
  accent: string
  /** accent as an "R,G,B" triplet, for rgba(var(--site-accent-rgb),a) tints. */
  accentRgb: string
  /**
   * Accent darkened until it clears WCAG AA against `canvas`.
   *
   * Use this whenever the accent is applied to TEXT on a light background. The raw
   * accent almost never passes: a mid-gold such as #c9a96e sits at 2.02:1 on an
   * off-white canvas, and the previous hardcoded #9B8B7A at 2.98:1 — both below the
   * 4.5:1 floor, and both were live on small uppercase eyebrow labels.
   */
  accentText: string
  /** Dark section background. */
  dark: string
  /** Elevated surface on top of `dark`. */
  darkAlt: string
  /** Deepest dark — the far end of the showcase hero gradient. */
  darkDeep: string
  /** Raised dark — the near end of the showcase hero gradient. */
  darkRaised: string
  /** Text on `dark` / `accent` fills. */
  onDark: string
  /**
   * Display face for interior-page headings. `--font-display` itself is global (both
   * fonts load on every site), so shared pages cannot use it directly without
   * restyling every preset. This token resolves to the body stack on hub/minimal —
   * an exact identity — and to the display face only on showcase.
   */
  fontDisplay: string
}

/**
 * Scale a colour toward black, preserving hue, until it clears `target` against `bg`.
 *
 * Ratios are computed with the same relativeLuminance the brand theme uses, so a
 * token and a contrast assertion in a test can never drift apart. Returns the input
 * untouched when it already passes — a dark blue accent needs no adjustment.
 */
function darkenToContrast(hex: string, bg: string, target = 4.5): string {
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  if (contrast(hex, bg) >= target) return hex
  const [r, g, b] = hexToRgb(hex.replace('#', ''))
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  for (let step = 1; step <= 100; step++) {
    const f = 1 - step / 100
    const candidate = `#${toHex(r * f)}${toHex(g * f)}${toHex(b * f)}`
    if (contrast(candidate, bg) >= target) return candidate
  }
  return '#000000'
}

/**
 * Showcase (editorial) surface palette. Warm off-white canvas, near-black ink, warm
 * hairlines — the values that were duplicated across the showcase files, now in one
 * place. The accent comes from the agent's own theme_color rather than a fixed gold,
 * which is what lets two showcase agents look different.
 */
const SHOWCASE = {
  canvas:     '#F5F3F0',
  surface:    '#FFFFFF',
  ink:        '#1C1C1E',
  body:       '#3D3D3D',
  muted:      '#6B6B6B',
  rule:       '#E8E3DC',
  dark:       '#1C1C1E',
  darkAlt:    '#242426',
  darkDeep:   '#161618',
  darkRaised: '#252527',
  onDark:     '#FFFFFF',
} as const

export function resolveSiteTheme(agent: AgentProfile): SiteTheme {
  const cfg = resolveSiteConfig(agent)
  const theme = resolveTheme(agent)

  // Non-showcase presets keep pointing at the existing global tokens, so hub and
  // minimal sites render byte-identically to before this module existed.
  if (cfg.layout_preset !== 'showcase') {
    return {
      canvas:     'var(--off-white)',
      surface:    '#fff',
      ink:        'var(--primary-bg)',
      body:       'var(--text)',
      muted:      'var(--text-muted)',
      rule:       'var(--border)',
      accent:     'var(--accent)',
      accentRgb:  'var(--accent-rgb)',
      accentText: 'var(--accent)',
      dark:       'var(--primary-bg)',
      darkAlt:    'var(--primary-bg)',
      darkDeep:   'var(--primary-bg)',
      darkRaised: 'var(--primary-bg)',
      onDark:     '#fff',
      // Interior headings inherit body's var(--font-sans) today; naming that value
      // keeps the substitution an identity.
      fontDisplay: 'var(--font-sans)',
    }
  }

  const accent = theme.accent
  return {
    ...SHOWCASE,
    accent,
    accentRgb: theme.accentRgb,
    accentText: darkenToContrast(accent, SHOWCASE.canvas),
    fontDisplay: "var(--font-display), Georgia, serif",
  }
}

/** Serialise the theme into the --site-* declarations the agent layout injects. */
export function siteThemeCssVars(t: SiteTheme): string {
  return [
    `--site-canvas:${t.canvas}`,
    `--site-surface:${t.surface}`,
    `--site-ink:${t.ink}`,
    `--site-body:${t.body}`,
    `--site-muted:${t.muted}`,
    `--site-rule:${t.rule}`,
    `--site-accent:${t.accent}`,
    `--site-accent-rgb:${t.accentRgb}`,
    `--site-accent-text:${t.accentText}`,
    `--site-dark:${t.dark}`,
    `--site-dark-alt:${t.darkAlt}`,
    `--site-dark-deep:${t.darkDeep}`,
    `--site-dark-raised:${t.darkRaised}`,
    `--site-on-dark:${t.onDark}`,
    `--site-font-display:${t.fontDisplay}`,
  ].join(';') + ';'
}
