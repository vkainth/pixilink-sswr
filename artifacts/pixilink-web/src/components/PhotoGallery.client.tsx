'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { imgUrl, imgUrlFull } from '@/lib/types'

interface Props {
  photos: string[]
  address: string
  virtualTour?: string | null
  status?: 'Active' | 'Sold'
  locked?: boolean
  agentPrefix?: string
}

export default function PhotoGallery({ photos, address, virtualTour, status, locked = false, agentPrefix }: Props) {
  const params = useParams()
  const slug = (params?.slug as string) || ''
  const prefix = agentPrefix ?? `/agent/${slug}`

  const [lightbox, setLightbox] = useState(false)
  const [index, setIndex] = useState(0)
  const [tab, setTab] = useState<'photos' | 'tour'>('photos')
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintShownRef = useRef(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartX = useRef<number | null>(null)
  const thumbStripRef = useRef<HTMLDivElement>(null)

  const count = photos.length
  const close = useCallback(() => setLightbox(false), [])

  const dismissHint = useCallback(() => {
    setShowHint(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
  }, [])

  const prev = useCallback(() => {
    dismissHint()
    setImgLoaded(false)
    setIndex(i => (i - 1 + count) % count)
  }, [count, dismissHint])

  const next = useCallback(() => {
    dismissHint()
    setImgLoaded(false)
    setIndex(i => (i + 1) % count)
  }, [count, dismissHint])

  const open = (i: number) => {
    if (locked) { setShowSignInModal(true); return }
    setImgLoaded(false)
    setIndex(i)
    setLightbox(true)
    // Show keyboard hint once per page load, desktop only
    if (!hintShownRef.current && window.innerWidth > 600) {
      hintShownRef.current = true
      setShowHint(true)
      hintTimerRef.current = setTimeout(() => setShowHint(false), 2000)
    }
  }

  function navSignIn(dest: 'register' | 'login') {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pxl_return_to', window.location.pathname + window.location.search)
    }
    // Carry the destination in the URL as well as sessionStorage: the query param is
    // what lets an already-authed visitor be redirected straight back, and what the
    // magic-link email embeds. sessionStorage alone is silently lost in both cases.
    const rt = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `${prefix}/${dest}?return_to=${rt}`
  }

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [lightbox, close, prev, next])

  useEffect(() => {
    if (!showSignInModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSignInModal(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [showSignInModal])

  // Cleanup hint timer on unmount
  useEffect(() => {
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current) }
  }, [])

  // Preload prev/next images (full-size) when index changes
  useEffect(() => {
    if (!lightbox || count < 2) return
    const toPreload = [
      (index + 1) % count,
      (index + 2) % count,
      (index - 1 + count) % count,
    ]
    toPreload.forEach(i => {
      const img = new Image()
      img.src = imgUrlFull(photos[i])
    })
  }, [lightbox, index, count, photos])

  // Keep active thumbnail visible in strip
  useEffect(() => {
    if (!lightbox || !thumbStripRef.current) return
    const strip = thumbStripRef.current
    const thumb = strip.children[index] as HTMLElement
    if (thumb) thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [lightbox, index])

  // Touch swipe handling
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev() }
    touchStartX.current = null
  }

  if (count === 0) {
    return (
      <div style={{ background: 'var(--primary-bg)', height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
    )
  }

  const sold = status === 'Sold'
  const thumbs = photos.slice(1, 5)
  const extra = count - 5

  return (
    <>
      <style>{`
        .pg-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 6px; height: 440px; }
        .pg-main { grid-column: 1; grid-row: 1 / 3; }
        .pg-cell { position: relative; overflow: hidden; cursor: pointer; background: #f3f4f6; }
        .pg-cell img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .35s ease; }
        .pg-cell:hover img { transform: scale(1.04); }
        @media (max-width: 820px) {
          .pg-grid { grid-template-columns: 1fr; grid-template-rows: auto; height: auto; }
          .pg-main { grid-column: auto; grid-row: auto; height: 280px; }
          .pg-thumb { display: none; }
        }

        /* ── Lightbox ── */
        .lb-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: #000;
          display: flex; flex-direction: column;
        }
        .lb-header {
          flex-shrink: 0; display: flex; align-items: center;
          justify-content: space-between; padding: 14px 20px;
          background: #000;
        }

        /* Three-column layout: gutter | image | gutter */
        .lb-body {
          flex: 1; display: grid;
          grid-template-columns: 80px 1fr 80px;
          min-height: 0;
        }
        .lb-gutter {
          background: #000;
          display: flex; align-items: center; justify-content: center;
        }
        .lb-img-area {
          position: relative; display: flex;
          align-items: center; justify-content: center;
          min-height: 0; overflow: hidden;
        }

        /* Blurred backdrop (thumbnail while full-size loads) */
        .lb-backdrop {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .lb-backdrop img {
          width: 100%; height: 100%;
          object-fit: contain;
          filter: blur(12px) brightness(0.55);
          transform: scale(1.08);
        }

        /* Spinner */
        .lb-spinner {
          position: absolute;
          width: 36px; height: 36px;
          border: 3px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lb-spin 0.7s linear infinite;
        }
        @keyframes lb-spin { to { transform: rotate(360deg); } }

        /* Full-size main image */
        .lb-main-img {
          position: relative; z-index: 1;
          max-width: 100%; max-height: 100%;
          object-fit: contain; display: block;
          opacity: 0; transition: opacity 0.2s ease;
        }
        .lb-main-img.loaded { opacity: 1; }

        /* Arrow buttons inside gutters */
        .lb-nav {
          background: rgba(255,255,255,0.13);
          border: 2px solid rgba(255,255,255,0.35);
          color: #fff; font-size: 28px;
          width: 52px; height: 52px; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, border-color 0.15s;
          user-select: none; backdrop-filter: blur(4px);
          flex-shrink: 0;
        }
        .lb-nav:hover { background: rgba(255,255,255,0.28); border-color: rgba(255,255,255,0.7); }

        /* Keyboard hint badge */
        .lb-hint {
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.72); color: rgba(255,255,255,0.85);
          font-size: 12px; padding: 6px 14px; border-radius: 20px;
          white-space: nowrap; pointer-events: none; z-index: 2;
          transition: opacity 0.4s ease;
        }
        .lb-hint.hidden { opacity: 0; }

        /* Thumbnail strip */
        .lb-strip {
          flex-shrink: 0; display: flex; gap: 6px;
          overflow-x: auto; padding: 10px 16px 14px;
          scroll-behavior: smooth; scrollbar-width: none;
          background: #000;
        }
        .lb-strip::-webkit-scrollbar { display: none; }
        .lb-strip-thumb {
          flex-shrink: 0; width: 72px; height: 54px;
          border-radius: 4px; overflow: hidden; cursor: pointer;
          border: 2px solid transparent; opacity: 0.55;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .lb-strip-thumb.active { border-color: #fff; opacity: 1; }
        .lb-strip-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* Overlaid arrows: hidden on desktop, shown only on mobile */
        .lb-nav-overlay { display: none; }

        /* ── Mobile ≤ 600px ── */
        @media (max-width: 600px) {
          .lb-body {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr;
          }
          .lb-gutter { display: none; }
          .lb-img-area { position: relative; }

          /* Show overlaid arrows on mobile */
          .lb-nav-overlay {
            display: flex;
            position: absolute; top: 50%; transform: translateY(-50%);
            z-index: 3;
            width: 44px; height: 44px; font-size: 22px;
            background: rgba(0,0,0,0.45);
            border: 1px solid rgba(255,255,255,0.25);
          }
          .lb-nav-overlay.lb-nav-prev { left: 8px; }
          .lb-nav-overlay.lb-nav-next { right: 8px; }
          .lb-hint { display: none; }
          .lb-strip-thumb { width: 56px; height: 42px; }
        }
      `}</style>

      {virtualTour && (
        <div style={{ display: 'flex', gap: 8, padding: '0 0 10px' }}>
          {(['photos', 'tour'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, padding: '7px 16px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
              {t === 'photos' ? `📷 Photos (${count})` : '🎬 Virtual Tour'}
            </button>
          ))}
        </div>
      )}

      {tab === 'tour' && virtualTour ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000', borderRadius: 10, overflow: 'hidden' }}>
          <iframe src={virtualTour} title="Virtual tour" allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="pg-grid">
            <div className="pg-cell pg-main" role="button" tabIndex={0}
              aria-label={locked ? 'Sign in to view photos' : `View photo 1 of ${count}`}
              onClick={() => open(0)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(0) } }}>
              <img src={imgUrl(photos[0], 800)} alt={address} fetchPriority="high" decoding="async"
                style={{ filter: locked ? 'blur(4px)' : sold ? 'saturate(0.55)' : 'none' }} />
              {locked ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(0,0,0,0.60)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>🔒 Sign in to view photos</div>
                </div>
              ) : null}
            </div>
            {thumbs.map((p, i) => {
              const realIndex = i + 1
              const isLast = i === thumbs.length - 1 && extra > 0
              return (
                <div key={realIndex} className="pg-cell pg-thumb" role="button" tabIndex={0}
                  aria-label={locked ? 'Sign in to view photos' : `View photo ${realIndex + 1} of ${count}`}
                  onClick={() => open(realIndex)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(realIndex) } }}>
                  <img src={imgUrl(p, 325)} alt={`${address} photo ${realIndex + 1}`} loading="lazy"
                    style={{ filter: locked ? 'blur(4px)' : sold ? 'saturate(0.55)' : 'none' }} />
                  {isLast && !locked && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800 }}>
                      +{extra} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {!locked && (
            <button onClick={() => open(0)} aria-label={`View all ${count} photos`}
              style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(0,0,0,0.72)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(2px)' }}>
              📷 Photos ({count})
            </button>
          )}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && !locked && (
        <div className="lb-overlay" role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${count}: ${address}`}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

          {/* Header */}
          <div className="lb-header">
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600 }}>
              {index + 1} <span style={{ opacity: 0.45 }}>/ {count}</span>
            </span>
            <button onClick={close} aria-label="Close"
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>

          {/* Three-column body: gutter | image | gutter */}
          <div className="lb-body">
            {/* Left gutter with prev arrow */}
            <div className="lb-gutter">
              {count > 1 && (
                <button className="lb-nav" onClick={prev} aria-label="Previous">‹</button>
              )}
            </div>

            {/* Image area */}
            <div className="lb-img-area" onClick={close}>
              {/* Blurred thumbnail backdrop while full image loads */}
              {!imgLoaded && (
                <div className="lb-backdrop">
                  <img src={imgUrl(photos[index], 325)} alt="" aria-hidden="true" />
                </div>
              )}

              {/* Spinner */}
              {!imgLoaded && <div className="lb-spinner" />}

              {/* Full-size image */}
              <img
                key={index}
                src={imgUrlFull(photos[index])}
                alt={`${address} photo ${index + 1}`}
                className={`lb-main-img${imgLoaded ? ' loaded' : ''}`}
                onLoad={() => setImgLoaded(true)}
                onClick={e => e.stopPropagation()}
              />

              {/* Mobile-only overlaid arrows (hidden on desktop via lb-nav-overlay) */}
              {count > 1 && (
                <>
                  <button className="lb-nav lb-nav-overlay lb-nav-prev" onClick={e => { e.stopPropagation(); prev() }} aria-label="Previous">‹</button>
                  <button className="lb-nav lb-nav-overlay lb-nav-next" onClick={e => { e.stopPropagation(); next() }} aria-label="Next">›</button>
                </>
              )}

              {/* Keyboard hint (desktop only, fades after 2s) */}
              <div className={`lb-hint${showHint ? '' : ' hidden'}`} aria-hidden="true">
                ← → navigate · Esc close
              </div>
            </div>

            {/* Right gutter with next arrow */}
            <div className="lb-gutter">
              {count > 1 && (
                <button className="lb-nav" onClick={next} aria-label="Next">›</button>
              )}
            </div>
          </div>

          {/* Thumbnail strip */}
          {count > 1 && (
            <div className="lb-strip" ref={thumbStripRef} onClick={e => e.stopPropagation()}>
              {photos.map((p, i) => (
                <div key={i} className={`lb-strip-thumb${i === index ? ' active' : ''}`} onClick={() => { dismissHint(); setImgLoaded(false); setIndex(i) }}>
                  <img src={imgUrl(p, 325)} alt={`Photo ${i + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign-in gate modal */}
      {showSignInModal && (
        <div role="dialog" aria-modal="true" aria-label="Sign in to view photos"
          onClick={() => setShowSignInModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, padding: '36px 32px 28px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.28)', position: 'relative' }}>
            <button onClick={() => setShowSignInModal(false)} aria-label="Close"
              style={{ position: 'absolute', top: 14, right: 18, background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Sign in to view all photos</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 1.65 }}>
              Create a free account to unlock all {count} photos and access full sold listing details.
            </div>
            <button onClick={() => navSignIn('register')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#1a7f37', color: '#fff', border: 'none', padding: '13px 24px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%', marginBottom: 10 }}>
              {/* NOT Google sign-in - navSignIn('register') goes to the email
                  registration form. See the same note in SoldPriceGate.tsx. */}
              Create free account
            </button>
            <button onClick={() => navSignIn('login')}
              style={{ width: '100%', background: '#f9fafb', color: '#111827', border: '1px solid #e5e7eb', padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Sign in with email or phone
            </button>
            <div style={{ marginTop: 20, fontSize: 12, color: '#9ca3af' }}>Free — no credit card needed</div>
          </div>
        </div>
      )}
    </>
  )
}
