'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminAgent } from '@/lib/admin-api'
import { imgUrl } from '@/lib/types'
import { apiPath } from '@/lib/admin-api-path'
import { TRUST_ICON_OPTIONS, TrustIcon, normalizeTrustIcon, type TrustIconId } from '@/lib/trust-icons'

interface ChipRow {
  text: string
  icon: TrustIconId
}

function normalizeChipRows(raw: Array<{ text: string; icon?: string } | string> | undefined | null): ChipRow[] {
  if (!raw || raw.length === 0) return [{ text: '', icon: 'star' }]
  return raw.map((c) =>
    typeof c === 'string'
      ? { text: c, icon: 'star' as TrustIconId }
      : { text: c.text ?? '', icon: normalizeTrustIcon(c.icon) }
  )
}

const THEMES = [
  { value: 'classic-dark', label: 'Classic Dark' },
  { value: 'modern-white', label: 'Modern White' },
]

const FEATURES: Record<string, string> = {
  school_catchments: 'School Catchment Pages',
  market_intelligence: 'Market Intelligence Pages',
  lifestyle_seo: 'Lifestyle SEO Pages',
  amenities_widget: 'Amenities Widget',
}

const ACCENT_SWATCHES = ['#d97706', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#0f172a']

function AchievementsEditor({
  items,
  setItems,
  placeholder,
}: {
  items: string[]
  setItems: (items: string[]) => void
  placeholder?: string
}) {
  return (
    <>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={item}
            onChange={(e) => {
              const updated = [...items]
              updated[i] = e.target.value
              setItems(updated)
            }}
            placeholder={placeholder ?? 'e.g. MLS Medallion Club — Top 10%'}
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              style={{ padding: '8px 12px', background: '#ffebe6', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#bf2600', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
            >
              &times;
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, ''])}
        style={{ fontSize: 12, color: '#0052cc', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        + Add credential
      </button>
    </>
  )
}

interface Props {
  agent?: AdminAgent
  cities: string[]
  subareas: Record<string, string[]>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', borderRadius: 8, border: '1px solid #dfe1e6', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f4f5f7', fontSize: 13, fontWeight: 600, color: '#172b4d' }}>
        {title}
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5e6c84', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#bf2600' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 11px', border: '1px solid #dfe1e6',
  borderRadius: 4, fontSize: 13, outline: 'none', background: '#fff',
}

const twoColGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px',
}

function ChipRowsEditor({
  rows,
  setRows,
  placeholder,
  addLabel,
}: {
  rows: ChipRow[]
  setRows: (rows: ChipRow[]) => void
  placeholder: string
  addLabel: string
}) {
  return (
    <>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 4, border: '1px solid #dfe1e6', background: '#fafbfc',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <TrustIcon icon={row.icon} size={16} />
          </div>
          <select
            style={{ ...inputStyle, width: 170, flexShrink: 0 }}
            value={row.icon}
            onChange={(e) => {
              const updated = [...rows]
              updated[i] = { ...updated[i], icon: e.target.value as TrustIconId }
              setRows(updated)
            }}
          >
            {TRUST_ICON_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={row.text}
            onChange={(e) => {
              const updated = [...rows]
              updated[i] = { ...updated[i], text: e.target.value }
              setRows(updated)
            }}
            placeholder={placeholder}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              style={{ padding: '8px 12px', background: '#ffebe6', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#bf2600', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
            >
              &times;
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, { text: '', icon: 'star' }])}
        style={{ fontSize: 12, color: '#0052cc', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {addLabel}
      </button>
    </>
  )
}

export default function AgentEditorForm({ agent, cities, subareas }: Props) {
  const router = useRouter()
  const isNew = !agent

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Basic Info
  const [name, setName] = useState(agent?.name ?? '')
  const [slug, setSlug] = useState(agent?.slug ?? '')
  const [brokerage, setBrokerage] = useState(agent?.brokerage ?? '')
  const [licenseNumber, setLicenseNumber] = useState(agent?.license_number ?? '')
  const [designation, setDesignation] = useState(agent?.settings?.designation ?? '')
  const [status, setStatus] = useState(agent?.status ?? 'active')

  // Contact
  const [email, setEmail] = useState(agent?.email ?? '')
  const [phone, setPhone] = useState(agent?.phone ?? '')
  const [bio, setBio] = useState(agent?.bio ?? '')

  // Branding
  const [themeSlug, setThemeSlug] = useState(agent?.theme_slug ?? 'classic-dark')
  const [themeColor, setThemeColor] = useState(agent?.theme_color ?? '#111111')
  const [primaryBgColor, setPrimaryBgColor] = useState(agent?.primary_bg_color ?? '#111111')

  // Photo + Focal Point
  const [photoUrl, setPhotoUrl] = useState(agent?.photo_path ?? '')
  const [headshotUrl, setHeadshotUrl] = useState(agent?.headshot_path ?? '')
  const [faviconUrl, setFaviconUrl] = useState(agent?.settings?.favicon_url ?? '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [focalX, setFocalX] = useState<number>(agent?.settings?.photo_focal_x ?? 50)
  const [focalY, setFocalY] = useState<number>(agent?.settings?.photo_focal_y ?? 0)

  // Design config — the whole site_config object is editable here. Values not touched
  // by these controls (anything hand-added to the JSON) are preserved on save via the
  // spread in buildSiteConfig, so this panel never silently drops an unknown key.
  const initialSc = agent?.settings?.site_config ?? {}
  const [layoutPreset, setLayoutPreset] = useState<string>(initialSc.layout_preset ?? 'hub')
  const [heroStyle, setHeroStyle] = useState<string>(initialSc.hero_style ?? 'full-bleed')
  const [navStyle, setNavStyle] = useState<string>(initialSc.nav_style ?? (initialSc.layout_preset === 'showcase' ? 'dark-bar' : 'centered'))
  const [fontPair, setFontPair] = useState<string>(initialSc.font_pair ?? 'serif-sans')
  const [palette, setPalette] = useState<string>(initialSc.palette ?? 'light')
  const [scSections, setScSections] = useState<Record<string, boolean | string>>({
    achievements:   initialSc.sections?.achievements ?? true,
    sold_gallery:   initialSc.sections?.sold_gallery ?? true,
    buildings:      initialSc.sections?.buildings ?? (initialSc.layout_preset !== 'showcase'),
    testimonials:   initialSc.sections?.testimonials ?? 'cards',
    market_reports: initialSc.sections?.market_reports ?? (initialSc.layout_preset !== 'showcase'),
    blog:           initialSc.sections?.blog ?? true,
    cta_home_eval:  initialSc.sections?.cta_home_eval ?? true,
    credentials:    initialSc.sections?.credentials ?? true,
    faqs:           initialSc.sections?.faqs ?? true,
  })
  const [showcaseHeroStyle, setShowcaseHeroStyle] = useState<string>(
    initialSc.showcase_hero_style ?? 'split'
  )

  // Hero Stats
  const initHs = agent?.settings?.hero_stats
  const [stat1Value, setStat1Value] = useState(initHs?.stat1_value ?? '')
  const [stat1Label, setStat1Label] = useState(initHs?.stat1_label ?? '')
  const [stat2Value, setStat2Value] = useState(initHs?.stat2_value ?? '')
  const [stat2Label, setStat2Label] = useState(initHs?.stat2_label ?? '')
  const [stat3Value, setStat3Value] = useState(initHs?.stat3_value ?? '')
  const [stat3Label, setStat3Label] = useState(initHs?.stat3_label ?? '')
  const [stat4Value, setStat4Value] = useState(initHs?.stat4_value ?? '')
  const [stat4Label, setStat4Label] = useState(initHs?.stat4_label ?? '')
  const [trustChips, setTrustChips] = useState<ChipRow[]>(normalizeChipRows(initHs?.trust_chips))
  const [highlights, setHighlights] = useState<ChipRow[]>(normalizeChipRows(initHs?.highlights))
  const [yearsExperience, setYearsExperience] = useState(initHs?.years_experience ?? '')
  const [valuePropBlurb, setValuePropBlurb] = useState(initHs?.value_prop_blurb ?? '')

  // SEO
  const [seoNoindex, setSeoNoindex] = useState(agent?.settings?.seo_noindex ?? true)

  // Local Guide positioning
  const [guideName, setGuideName] = useState(agent?.settings?.guide_name ?? '')

  // Domain + Tracking
  const [customDomain, setCustomDomain] = useState(agent?.settings?.custom_domain ?? '')
  const [residencyRegion, setResidencyRegion] = useState(agent?.settings?.residencity_region ?? '')
  const [ga4Id, setGa4Id] = useState(agent?.settings?.ga4_id ?? '')
  const [fbPixelId, setFbPixelId] = useState(agent?.settings?.fb_pixel_id ?? '')
  const [fubEnabled, setFubEnabled] = useState(agent?.settings?.fub_enabled ?? false)
  const [fubApiKey, setFubApiKey] = useState('')

  // Notifications
  const [notifEmail, setNotifEmail] = useState(agent?.settings?.notification_email ?? '')
  const [notifPhone, setNotifPhone] = useState(agent?.settings?.notification_phone ?? '')

  // Social links
  const [facebook, setFacebook] = useState(agent?.settings?.social_links?.facebook ?? '')
  const [instagram, setInstagram] = useState(agent?.settings?.social_links?.instagram ?? '')
  const [linkedin, setLinkedin] = useState(agent?.settings?.social_links?.linkedin ?? '')
  const [youtube, setYoutube] = useState(agent?.settings?.social_links?.youtube ?? '')

  // MLS IDs
  const [mlsIds, setMlsIds] = useState<string[]>(agent?.mls_ids ?? [''])

  // Territories (cities) + subarea whitelist
  const [territories, setTerritories] = useState<string[]>(agent?.territories ?? [])
  const [subareaWhitelist, setSubareaWhitelist] = useState<string[]>(
    agent?.settings?.subarea_whitelist ?? []
  )

  // Features
  const [features, setFeatures] = useState<Record<string, boolean>>(
    agent?.features ?? Object.fromEntries(Object.keys(FEATURES).map((k) => [k, false]))
  )

  // Credentials & Achievements
  const initAchievements = agent?.settings?.achievements
  const [achievements, setAchievements] = useState<string[]>(
    initAchievements?.length ? initAchievements.map((a) => a.label) : ['']
  )
  const initCoAgentAch = agent?.settings?.co_agent_achievements ?? {}
  const [coAgentAchievements, setCoAgentAchievements] = useState<Record<string, string[]>>(
    Object.fromEntries(Object.entries(initCoAgentAch).map(([k, v]) => [k, v.length ? v.map((a) => a.label) : ['']]))
  )
  const teamMembers = agent?.settings?.team_members ?? []
  const coAgentNames = teamMembers
    .filter((m) => m.photo && m.name && m.name.trim().toLowerCase() !== (agent?.name ?? '').trim().toLowerCase())
    .map((m) => m.name.trim())

  const photoPreviewSrc = photoUrl ? imgUrl(photoUrl, 400) : null
  const headshotPreviewSrc = headshotUrl || null

  async function handlePhotoUpload(file: File) {
    if (!agent?.id) {
      setError('Save the agent first before uploading a photo.')
      return
    }
    setUploadingPhoto(true)
    setError('')
    const formData = new FormData()
    formData.append('photo', file)
    try {
      const res = await fetch(apiPath(`/api/admin/agents/${agent.id}/upload-photo`), {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setPhotoUrl(data.photo_url)
        setSuccess('Photo uploaded successfully!')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Network error during upload')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function toggleTerritory(city: string) {
    setTerritories((prev) => {
      if (prev.includes(city)) {
        const citySubs = subareas[city] ?? []
        setSubareaWhitelist((sw) => sw.filter((s) => !citySubs.includes(s)))
        return prev.filter((c) => c !== city)
      }
      return [...prev, city]
    })
  }

  function toggleSubarea(sub: string) {
    setSubareaWhitelist((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    )
  }

  function selectAllSubareas(city: string) {
    const citySubs = subareas[city] ?? []
    setSubareaWhitelist((prev) => {
      const without = prev.filter((s) => !citySubs.includes(s))
      return [...without, ...citySubs]
    })
  }

  function clearAllSubareas(city: string) {
    const citySubs = subareas[city] ?? []
    setSubareaWhitelist((prev) => prev.filter((s) => !citySubs.includes(s)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const heroStatsPayload = {
      stat1_value: stat1Value || null,
      stat1_label: stat1Label || null,
      stat2_value: stat2Value || null,
      stat2_label: stat2Label || null,
      stat3_value: stat3Value || null,
      stat3_label: stat3Label || null,
      stat4_value: stat4Value || null,
      stat4_label: stat4Label || null,
      trust_chips: trustChips.filter((c) => c.text.trim()),
      highlights: highlights.filter((c) => c.text.trim()),
      years_experience: yearsExperience || null,
      value_prop_blurb: valuePropBlurb || null,
    }
    const hasHeroStats = Object.values(heroStatsPayload).some(v =>
      v !== null && !(Array.isArray(v) && v.length === 0)
    )

    // Merge over the stored object rather than rebuilding it, so any key added by hand
    // to the JSON (or by a future panel) survives a save from this form.
    const siteConfig = JSON.stringify({
      ...(agent?.settings?.site_config ?? {}),
      layout_preset: layoutPreset,
      showcase_hero_style: showcaseHeroStyle,
      hero_style: heroStyle,
      nav_style: navStyle,
      font_pair: fontPair,
      palette,
      sections: scSections,
    })

    const payload = {
      name, slug: slug || undefined, brokerage: brokerage || null, email,
      phone: phone || null, bio: bio || null, license_number: licenseNumber || null,
      designation: designation || null,
      theme_slug: themeSlug, theme_color: themeColor, primary_bg_color: primaryBgColor,
      status, guide_name: guideName || null,
      custom_domain: customDomain || null,
      residencity_region: residencyRegion || null,
      ga4_id: ga4Id || null,
      fb_pixel_id: fbPixelId || null, fub_enabled: fubEnabled,
      fub_api_key: fubApiKey || undefined,
      notification_email: notifEmail || null, notification_phone: notifPhone || null,
      social_links: { facebook, instagram, linkedin, youtube },
      mls_ids: mlsIds.filter(Boolean),
      territories,
      subarea_whitelist: subareaWhitelist.length > 0 ? subareaWhitelist : null,
      features,
      seo_noindex: seoNoindex,
      photo_focal_x: focalX,
      photo_focal_y: focalY,
      headshot_path: headshotUrl || null,
      favicon_url: faviconUrl || null,
      site_config: siteConfig,
      hero_stats: hasHeroStats ? JSON.stringify(heroStatsPayload) : null,
      achievements: achievements.some((a) => a.trim())
        ? JSON.stringify(achievements.filter((a) => a.trim()).map((a) => ({ label: a })))
        : null,
      co_agent_achievements: Object.keys(coAgentAchievements).some((k) =>
        coAgentAchievements[k].some((a) => a.trim())
      )
        ? JSON.stringify(
            Object.fromEntries(
              Object.entries(coAgentAchievements)
                .filter(([, v]) => v.some((a) => a.trim()))
                .map(([k, v]) => [k, v.filter((a) => a.trim()).map((a) => ({ label: a }))])
            )
          )
        : null,
    }

    try {
      const url = isNew ? apiPath('/api/admin/agents') : apiPath(`/api/admin/agents/${agent!.id}`)
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        // site_config now travels in the main payload; the old follow-up PUT to
        // /site-config only ever wrote showcase_hero_style — and silently no-oped until
        // agentUpdate's validator learned the key, since validate() strips unknown input.
        setSuccess(isNew ? 'Agent created successfully!' : 'Agent updated successfully!')
        if (isNew && data?.id) {
          router.push(`/admin/agents/${data.id}`)
        }
      } else {
        const data = await res.json().catch(() => ({}))
        if (data.details?.errors) {
          const msgs = Object.values(data.details.errors as Record<string, string[]>).flat()
          setError(msgs.join(' '))
        } else {
          setError(data.error || 'Failed to save agent')
        }
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleSuspend() {
    if (!agent || !confirm(`Suspend ${agent.name}? They will lose access to their portal.`)) return
    setSaving(true)
    try {
      const res = await fetch(apiPath(`/api/admin/agents/${agent.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' }),
      })
      if (res.ok) { setSuccess('Agent suspended.'); setStatus('suspended') }
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: '#ffebe6', color: '#bf2600', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#e3fcef', color: '#006644', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Basic Info */}
      <Section title="Basic Info">
        <div style={twoColGrid}>
          <Field label="Full Name" required>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Slug" required>
            <input style={inputStyle} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated if blank" />
          </Field>
        </div>
        <div style={twoColGrid}>
          <Field label="Brokerage">
            <input style={inputStyle} value={brokerage} onChange={(e) => setBrokerage(e.target.value)} />
          </Field>
          <Field label="License Number">
            <input style={inputStyle} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
          </Field>
        </div>
        <div style={twoColGrid}>
          <Field label="Designation (e.g. PREC*)">
            <input
              style={inputStyle}
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. PREC*"
            />
            <div style={{ fontSize: 11, color: '#5e6c84', marginTop: 4 }}>
              Shown in small muted text beside the agent&apos;s name on the About page dual-agent hero.
            </div>
          </Field>
          <div />
        </div>
        <Field label="Status">
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </Field>
      </Section>

      {/* Local Guide Positioning */}
      <Section title="Local Guide Positioning">
        <Field label="Guide Name / Tagline">
          <input
            style={inputStyle}
            value={guideName}
            onChange={(e) => setGuideName(e.target.value)}
            placeholder="e.g. South Surrey & White Rock Homes for Sale"
          />
        </Field>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: -8 }}>
          When set, the site header, homepage headline, and meta titles lead with this name as the
          local real estate authority, crediting the agent as &ldquo;powered by [Agent]&rdquo; rather
          than making the agent the headline. Leave blank to keep the agent&rsquo;s name as the
          primary headline.
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact">
        <div style={twoColGrid}>
          <Field label="Email" required>
            <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Phone">
            <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="Bio">
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </Field>
      </Section>

      {/* Branding */}
      <Section title="Branding">
        <div style={twoColGrid}>
          <Field label="Theme">
            <select style={inputStyle} value={themeSlug} onChange={(e) => setThemeSlug(e.target.value)}>
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <div />
        </div>
        <Field label="Accent Color">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c} type="button"
                onClick={() => setThemeColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: 4, background: c, border: 'none',
                  cursor: 'pointer', outline: themeColor === c ? `2px solid #0052cc` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              style={{ width: 28, height: 28, padding: 0, border: '1px solid #dfe1e6', borderRadius: 4, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: '#5e6c84', fontFamily: 'monospace' }}>{themeColor}</span>
          </div>
        </Field>
        <Field label="Primary Background Color">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={primaryBgColor}
              onChange={(e) => setPrimaryBgColor(e.target.value)}
              style={{ width: 28, height: 28, padding: 0, border: '1px solid #dfe1e6', borderRadius: 4, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: '#5e6c84', fontFamily: 'monospace' }}>{primaryBgColor}</span>
          </div>
        </Field>

        {/* Agent Photo Upload */}
        <Field label="Agent Photo">
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {photoPreviewSrc && (
              <div style={{ position: 'relative', width: 80, height: 96, flexShrink: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #dfe1e6' }}>
                <img
                  src={photoPreviewSrc}
                  alt="Agent photo preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focalX}% ${focalY}%`, display: 'block' }}
                />
                <div style={{
                  position: 'absolute',
                  left: `${focalX}%`,
                  top: `${focalY}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'rgba(0,82,204,0.85)',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 1px rgba(0,82,204,0.4)',
                  pointerEvents: 'none',
                }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#f4f5f7', border: '1px solid #dfe1e6', borderRadius: 4,
                cursor: uploadingPhoto ? 'not-allowed' : 'pointer', fontSize: 13,
                color: '#42526e', fontWeight: 500, opacity: uploadingPhoto ? 0.6 : 1,
              }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  disabled={uploadingPhoto || isNew}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handlePhotoUpload(file)
                    e.target.value = ''
                  }}
                />
                {uploadingPhoto ? 'Uploading…' : '📷 Upload Photo'}
              </label>
              {isNew && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#5e6c84' }}>
                  Save the agent first, then upload a photo.
                </div>
              )}
              {photoUrl && !isNew && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#5e6c84', wordBreak: 'break-all', maxWidth: 340 }}>
                  {photoUrl}
                </div>
              )}
            </div>
          </div>
        </Field>

        {/* Focal Point */}
        <Field label="Photo Focal Point">
          <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 10 }}>
            Set where the photo centers in circular avatars and portrait crops. The blue dot on the preview shows the current focal point.
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Face X %</div>
              <input
                type="number"
                min={0}
                max={100}
                value={focalX}
                onChange={(e) => setFocalX(Math.min(100, Math.max(0, Number(e.target.value))))}
                style={{ ...inputStyle, width: 80 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Face Y %</div>
              <input
                type="number"
                min={0}
                max={100}
                value={focalY}
                onChange={(e) => setFocalY(Math.min(100, Math.max(0, Number(e.target.value))))}
                style={{ ...inputStyle, width: 80 }}
              />
            </div>
            <button
              type="button"
              onClick={() => { setFocalX(50); setFocalY(0) }}
              style={{ fontSize: 12, color: '#5e6c84', background: 'none', border: '1px solid #dfe1e6', borderRadius: 4, padding: '8px 12px', cursor: 'pointer', marginBottom: 0 }}
            >
              Reset
            </button>
          </div>
        </Field>

        {/* Headshot URL */}
        <Field label="Headshot URL">
          <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 8 }}>
            Face-focused crop used in the nav avatar (36×36) and sticky footer (38×38). When set, overrides the photo above for those small circular slots. Leave blank to fall back to the main photo.
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {headshotPreviewSrc && (
              <img
                src={headshotPreviewSrc}
                alt="Headshot preview"
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 50%', border: '2px solid #dfe1e6', flexShrink: 0 }}
              />
            )}
            <input
              style={inputStyle}
              value={headshotUrl}
              onChange={(e) => setHeadshotUrl(e.target.value)}
              placeholder="/images/randy-headshot-v3.webp"
            />
          </div>
        </Field>

        {/* Favicon URL */}
        <Field label="Favicon Image URL">
          <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 8 }}>
            Custom browser tab icon for this agent&apos;s site. When set, this image is used as the favicon and Apple touch icon instead of the agent photo crop. Use a square image (e.g. a logo). Leave blank to use the agent&apos;s headshot/photo as a circular favicon.
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {faviconUrl && (
              <img
                src={faviconUrl}
                alt="Favicon preview"
                style={{ width: 32, height: 32, objectFit: 'contain', border: '1px solid #dfe1e6', borderRadius: 4, flexShrink: 0, background: '#f4f5f7' }}
              />
            )}
            <input
              style={inputStyle}
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="/favicons/residencity-32.png"
            />
          </div>
        </Field>
      </Section>

      {/* Design — the site_config controls. Only options a preset actually honours are
          shown for it, so nothing here silently does nothing. */}
      <Section title="Design">
        <Field label="Layout Preset">
          <select style={inputStyle} value={layoutPreset} onChange={(e) => setLayoutPreset(e.target.value)}>
            <option value="hub">Hub — full content site: neighbourhoods, market reports, guides</option>
            <option value="showcase">Showcase — editorial personal-brand homepage, shared property pages</option>
            <option value="minimal">Minimal — lean single-purpose site</option>
          </select>
          <div style={{ fontSize: 11, color: '#5e6c84', marginTop: 4 }}>
            Switching preset changes which pages exist: showcase serves about / sell-with-me /
            featured-properties / contact and 404s hub-only routes (sellers, buyers, neighbourhoods…), and vice versa.
          </div>
        </Field>

        {layoutPreset === 'showcase' ? (
          <Field label="Hero Style">
            <select
              style={inputStyle}
              value={showcaseHeroStyle}
              onChange={(e) => setShowcaseHeroStyle(e.target.value)}
            >
              <option value="split">Split — photo right, text left (desktop) / stacked (mobile)</option>
              <option value="fullbleed-cinematic">Full-bleed Cinematic — photo fills viewport, text overlay</option>
              <option value="editorial-stack">Editorial Stack — photo strip on top, text + stats below</option>
            </select>
            <div style={{ fontSize: 11, color: '#5e6c84', marginTop: 4 }}>
              The strip heroes use the agent&apos;s <code>hero</code> image from agent media when one is set,
              falling back to the portrait.
            </div>
          </Field>
        ) : (
          <div style={twoColGrid}>
            <Field label="Hero Style">
              <select style={inputStyle} value={heroStyle} onChange={(e) => setHeroStyle(e.target.value)}>
                <option value="full-bleed">Full-bleed photo</option>
                <option value="split">Split — text and photo</option>
                <option value="circle-centered">Circle portrait, centered</option>
                <option value="text-only">Text only</option>
                <option value="photo-strip">Photo strip</option>
              </select>
            </Field>
            <Field label="Nav Style">
              <select style={inputStyle} value={navStyle} onChange={(e) => setNavStyle(e.target.value)}>
                <option value="centered">Centered</option>
                <option value="dark-bar">Dark bar</option>
                <option value="transparent-hero">Transparent over hero</option>
                <option value="minimal">Minimal</option>
              </select>
            </Field>
          </div>
        )}

        <div style={twoColGrid}>
          <Field label="Type Pairing">
            <select style={inputStyle} value={fontPair} onChange={(e) => setFontPair(e.target.value)}>
              <option value="serif-sans">Serif headings + sans body (Playfair / Inter)</option>
              <option value="all-sans">All sans (Inter)</option>
              <option value="geometric">Geometric (DM Sans)</option>
            </select>
          </Field>
          <Field label="Palette">
            <select style={inputStyle} value={palette} onChange={(e) => setPalette(e.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark canvas</option>
            </select>
          </Field>
        </div>

        <Field label="Homepage Sections">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', paddingTop: 2 }}>
            {([
              ['achievements',   'Achievements',    null],
              ['sold_gallery',   'Sold gallery',    null],
              ['testimonials',   'Testimonials',    null],
              ['cta_home_eval',  'Home eval CTA',   null],
              ['credentials',    'Hero credentials', null],
              ['faqs',           'FAQs',            null],
              ['buildings',      'Buildings',       'hub only'],
              ['market_reports', 'Market reports',  'hub only'],
              ['blog',           'Blog teaser',     'hub only'],
            ] as [string, string, string | null][]).map(([key, label, note]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#172b4d' }}>
                <input
                  type="checkbox"
                  checked={scSections[key] !== false}
                  onChange={(e) => setScSections({
                    ...scSections,
                    // testimonials is a variant union, not a boolean — re-enabling
                    // restores the cards style rather than a bare `true`.
                    [key]: key === 'testimonials' ? (e.target.checked ? 'cards' : false) : e.target.checked,
                  })}
                />
                {label}
                {note && <span style={{ fontSize: 10, color: '#8993a4' }}>({note})</span>}
              </label>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#5e6c84', marginTop: 8 }}>
            A section also needs data to render — an enabled sold gallery with no sold listings still hides itself.
          </div>
        </Field>
      </Section>

      {/* Domain + Tracking */}
      <Section title="Domain & Tracking">
        <Field label="Custom Domain">
          <input style={inputStyle} value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="randydyck.com" />
        </Field>
        <Field label="Residencity.ca Region Slug">
          <input
            style={inputStyle}
            value={residencyRegion}
            onChange={(e) => setResidencyRegion(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="south-surrey"
          />
          <div style={{ fontSize: 11, color: '#5e6c84', marginTop: 4 }}>
            Assigns this agent to a residencity.ca region (e.g. <code>south-surrey</code>). Must be unique across agents. Leave blank if not on residencity.ca.
          </div>
        </Field>
        <div style={twoColGrid}>
          <Field label="GA4 Measurement ID">
            <input style={inputStyle} value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" />
          </Field>
          <Field label="Facebook Pixel ID">
            <input style={inputStyle} value={fbPixelId} onChange={(e) => setFbPixelId(e.target.value)} placeholder="123456789" />
          </Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={fubEnabled} onChange={(e) => setFubEnabled(e.target.checked)} />
            Enable Follow Up Boss (FUB) integration
          </label>
        </div>
        {fubEnabled && (
          <Field label="FUB API Key">
            <input
              type="password"
              style={inputStyle}
              value={fubApiKey}
              onChange={(e) => setFubApiKey(e.target.value)}
              placeholder="Leave blank to keep existing key"
            />
          </Field>
        )}
      </Section>

      {/* SEO Indexing */}
      <Section title="Search Engine Indexing">
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 6,
          background: seoNoindex ? '#fffbeb' : '#e3fcef',
          border: `1px solid ${seoNoindex ? '#fcd34d' : '#6ee7b7'}`,
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
            <input
              type="checkbox"
              checked={seoNoindex}
              onChange={(e) => setSeoNoindex(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: seoNoindex ? '#92400e' : '#065f46' }}>
                {seoNoindex ? '🚫 Block search indexing (noindex)' : '✓ Allow search indexing'}
              </div>
              <div style={{ fontSize: 12, color: '#5e6c84', marginTop: 3 }}>
                {seoNoindex
                  ? 'Google and other search engines are blocked from indexing this site. Enable this while still building.'
                  : 'The site is visible to search engines. Uncheck to block indexing if you need to pause.'}
              </div>
            </div>
          </label>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div style={twoColGrid}>
          <Field label="Lead Notification Email">
            <input type="email" style={inputStyle} value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} />
          </Field>
          <Field label="Lead Notification Phone">
            <input style={inputStyle} value={notifPhone} onChange={(e) => setNotifPhone(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Social Links */}
      <Section title="Social Links">
        <div style={twoColGrid}>
          <Field label="Facebook URL">
            <input style={inputStyle} value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
          </Field>
          <Field label="Instagram URL">
            <input style={inputStyle} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." />
          </Field>
          <Field label="LinkedIn URL">
            <input style={inputStyle} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </Field>
          <Field label="YouTube URL">
            <input style={inputStyle} value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." />
          </Field>
        </div>
      </Section>

      {/* Territory */}
      <Section title="Territory & Subareas">
        <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 12 }}>
          Select the cities this agent covers. Then choose specific subareas — or select all for a city.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cities.map((city) => {
            const isSelected = territories.includes(city)
            const citySubs = subareas[city] ?? []
            const selectedSubs = citySubs.filter((s) => subareaWhitelist.includes(s))
            const allSelected = citySubs.length > 0 && selectedSubs.length === citySubs.length

            return (
              <div key={city}>
                {/* City pill */}
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
                  background: isSelected ? '#deebff' : '#f4f5f7',
                  color: isSelected ? '#0052cc' : '#5e6c84',
                  padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
                  border: isSelected ? '1px solid #4c9aff' : '1px solid transparent',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all .15s',
                }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTerritory(city)}
                    style={{ display: 'none' }}
                  />
                  {city}
                  {isSelected && citySubs.length > 0 && (
                    <span style={{
                      fontSize: 11, background: '#0052cc', color: '#fff',
                      borderRadius: 10, padding: '1px 6px', marginLeft: 2,
                    }}>
                      {selectedSubs.length}/{citySubs.length}
                    </span>
                  )}
                </label>

                {/* Subareas — shown when city is selected and has subareas */}
                {isSelected && citySubs.length > 0 && (
                  <div style={{
                    marginTop: 8, marginLeft: 16,
                    padding: '12px 14px', background: '#f8f9fb',
                    borderRadius: 6, border: '1px solid #e8eaf0',
                  }}>
                    {/* Select all / Clear all controls */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#5e6c84', fontWeight: 600 }}>SUBAREAS</span>
                      <button
                        type="button"
                        onClick={() => allSelected ? clearAllSubareas(city) : selectAllSubareas(city)}
                        style={{
                          fontSize: 11, color: '#0052cc', background: 'none',
                          border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600,
                        }}
                      >
                        {allSelected ? 'Clear all' : 'Select all'}
                      </button>
                    </div>

                    {/* Subarea checkboxes */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {citySubs.map((sub) => {
                        const checked = subareaWhitelist.includes(sub)
                        return (
                          <label
                            key={sub}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                              background: checked ? '#e3fcef' : '#fff',
                              color: checked ? '#006644' : '#42526e',
                              padding: '4px 9px', borderRadius: 4, cursor: 'pointer',
                              border: `1px solid ${checked ? '#6ee7b7' : '#dfe1e6'}`,
                              transition: 'all .12s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSubarea(sub)}
                              style={{ width: 12, height: 12, cursor: 'pointer', accentColor: '#36b37e' }}
                            />
                            {sub}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary of selected subareas */}
        {subareaWhitelist.length > 0 && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#e3fcef', borderRadius: 6, fontSize: 12, color: '#006644' }}>
            <strong>{subareaWhitelist.length} subarea{subareaWhitelist.length !== 1 ? 's' : ''} selected</strong>
            {' — listings and neighbourhood pages will be scoped to these subareas only.'}
          </div>
        )}
        {territories.length > 0 && subareaWhitelist.length === 0 && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#fffbeb', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
            No subareas selected — all listings in the selected cities will be shown.
          </div>
        )}
      </Section>

      {/* MLS IDs */}
      <Section title="MLS IDs">
        {mlsIds.map((mlsId, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={mlsId}
              onChange={(e) => {
                const updated = [...mlsIds]
                updated[i] = e.target.value
                setMlsIds(updated)
              }}
              placeholder="e.g. FDYCKRA"
            />
            {mlsIds.length > 1 && (
              <button
                type="button"
                onClick={() => setMlsIds(mlsIds.filter((_, j) => j !== i))}
                style={{ padding: '8px 12px', background: '#ffebe6', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#bf2600', fontSize: 18, lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setMlsIds([...mlsIds, ''])}
          style={{ fontSize: 12, color: '#0052cc', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          + Add MLS ID
        </button>
      </Section>

      {/* Hero Stats */}
      <Section title="Hero Stats">
        <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 14 }}>
          The 4-tile achievement grid and trust chip strip on the homepage hero. Leave blank to use the built-in defaults for this agent.
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: '#172b4d', marginBottom: 10 }}>Stat Tiles</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          {([
            { label: 'Tile 1 Value', val: stat1Value, set: setStat1Value, lbl: stat1Label, setLbl: setStat1Label, lname: 'Tile 1 Label', ph: '5,200+', lph: 'Families Helped' },
            { label: 'Tile 2 Value', val: stat2Value, set: setStat2Value, lbl: stat2Label, setLbl: setStat2Label, lname: 'Tile 2 Label', ph: '5.0\u2605', lph: '232 Google Reviews' },
            { label: 'Tile 3 Value', val: stat3Value, set: setStat3Value, lbl: stat3Label, setLbl: setStat3Label, lname: 'Tile 3 Label', ph: '30+', lph: 'Years Experience' },
            { label: 'Tile 4 Value', val: stat4Value, set: setStat4Value, lbl: stat4Label, setLbl: setStat4Label, lname: 'Tile 4 Label', ph: "eXp President's Award", lph: 'Top Honour' },
          ]).map((row) => (
            <React.Fragment key={row.label}>
              <Field label={row.label}>
                <input style={inputStyle} value={row.val ?? ''} onChange={(e) => row.set(e.target.value)} placeholder={row.ph} />
              </Field>
              <Field label={row.lname}>
                <input style={inputStyle} value={row.lbl ?? ''} onChange={(e) => row.setLbl(e.target.value)} placeholder={row.lph} />
              </Field>
            </React.Fragment>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: '#172b4d', marginTop: 16, marginBottom: 10 }}>Trust Chips (strip below hero)</div>
        <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 10 }}>
          One chip per row — pick an icon and short text. Leave all blank to use built-in defaults.
        </div>
        <ChipRowsEditor
          rows={trustChips}
          setRows={setTrustChips}
          placeholder="e.g. 5.0 · 232 Google Reviews"
          addLabel="+ Add chip"
        />
      </Section>

      {/* Agent Highlights */}
      <Section title="Agent Highlights">
        <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 14 }}>
          A longer list of credentials shown in a &quot;Why Work With&quot; section after the trust band (e.g. &quot;Top 10% of Realtors in GVR&quot;, &quot;Speak English + Farsi&quot;). Leave empty to hide this section.
        </div>
        <ChipRowsEditor
          rows={highlights}
          setRows={setHighlights}
          placeholder="e.g. Over $60M volume in 2025"
          addLabel="+ Add highlight"
        />
      </Section>

      {/* Value Prop / CTA Block */}
      <Section title="Value Prop / CTA Block">
        <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 14 }}>
          Powers the site-wide &quot;why work with me&quot; card with a phone call-to-action, shown across
          the site (homepage, listings, market pages). Leave blank to hide the years-experience/blurb
          copy — the card still shows using the agent&apos;s name, awards (from Highlights above), and phone.
        </div>
        <div style={twoColGrid}>
          <Field label="Years of Experience">
            <input
              style={inputStyle}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="e.g. 30+"
            />
          </Field>
          <div />
        </div>
        <Field label="Value Prop Blurb">
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={valuePropBlurb}
            onChange={(e) => setValuePropBlurb(e.target.value)}
            placeholder="e.g. I've helped over 5,200 families buy and sell homes across South Surrey & White Rock — let's talk about your move."
          />
        </Field>
      </Section>

      {/* Credentials & Achievements */}
      <Section title="Credentials & Achievements">
        <div style={{ fontSize: 12, color: '#5e6c84', marginBottom: 16 }}>
          These credentials appear on the Top REALTOR® page under each agent&apos;s name. One item per row.
          Leave all blank to keep using the current defaults.
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#172b4d', marginBottom: 10 }}>
            {agent?.name || 'Primary Agent'} — Credentials
          </div>
          <AchievementsEditor items={achievements} setItems={setAchievements} />
        </div>

        {coAgentNames.map((coName) => {
          const key = coName.trim().toLowerCase()
          const items = coAgentAchievements[key] ?? ['']
          return (
            <div key={key} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f4f5f7' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#172b4d', marginBottom: 10 }}>
                {coName} — Credentials
              </div>
              <AchievementsEditor
                items={items}
                setItems={(updated) =>
                  setCoAgentAchievements((prev) => ({ ...prev, [key]: updated }))
                }
              />
            </div>
          )
        })}

        {coAgentNames.length === 0 && (
          <div style={{ fontSize: 12, color: '#5e6c84', fontStyle: 'italic' }}>
            No co-agents detected (team members with photos). Co-agent credentials will appear here once team members are configured.
          </div>
        )}
      </Section>

      {/* Feature Flags */}
      <Section title="Feature Flags">
        {Object.entries(FEATURES).map(([key, label]) => (
          <label
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}
          >
            <div
              onClick={() => setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))}
              style={{
                width: 38, height: 22, borderRadius: 11, position: 'relative', cursor: 'pointer',
                background: features[key] ? '#36b37e' : '#dfe1e6', transition: 'background .2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left .2s',
                left: features[key] ? 19 : 3,
                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              }} />
            </div>
            <span style={{ fontSize: 13, color: '#172b4d' }}>{label}</span>
          </label>
        ))}
      </Section>

      {/* Save bar */}
      <div style={{
        position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #dfe1e6',
        padding: '14px 0', marginTop: 8, display: 'flex', gap: 12, alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: saving ? '#7ab3e0' : '#0052cc', color: '#fff',
            border: 'none', borderRadius: 4, padding: '9px 22px',
            fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : isNew ? 'Create Agent' : 'Save Changes'}
        </button>
        <a href="/admin/agents" style={{ fontSize: 13, color: '#5e6c84' }}>Cancel</a>
        {error && (
          <span style={{ fontSize: 13, color: '#bf2600', fontWeight: 500 }}>⚠ {error}</span>
        )}
        {success && (
          <span style={{ fontSize: 13, color: '#006644', fontWeight: 500 }}>✓ {success}</span>
        )}
        {!isNew && agent?.status !== 'suspended' && (
          <button
            type="button"
            onClick={handleSuspend}
            disabled={saving}
            style={{
              marginLeft: 'auto', background: 'none', border: '1px solid #dfe1e6',
              color: '#bf2600', borderRadius: 4, padding: '8px 14px',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            Suspend Agent
          </button>
        )}
      </div>
    </form>
  )
}
