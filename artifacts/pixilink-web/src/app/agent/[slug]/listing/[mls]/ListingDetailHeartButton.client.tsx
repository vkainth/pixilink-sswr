'use client'

import { useFavorites } from '@/lib/FavoritesContext'

export default function ListingDetailHeartButton({ mlsNo }: { mlsNo: string }) {
  const { isSaved, toggle, loading, isLoggedIn } = useFavorites()
  const saved = isSaved(mlsNo)

  if (loading) return null

  return (
    <button
      onClick={() => toggle(mlsNo)}
      title={saved ? 'Remove from saved' : 'Save this listing'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: saved ? 'var(--accent)' : 'transparent',
        border: `1.5px solid ${saved ? 'var(--accent)' : 'var(--border)'}`,
        color: saved ? 'var(--primary-bg)' : 'var(--text-muted)',
        borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', letterSpacing: 0.3,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        if (!saved) {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.color = 'var(--accent)'
        }
      }}
      onMouseLeave={e => {
        if (!saved) {
          e.currentTarget.style.borderColor = 'var(--border, #e5e7eb)'
          e.currentTarget.style.color = 'var(--text-muted, #6b7280)'
        }
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      {saved ? 'Saved' : (isLoggedIn ? 'Save' : 'Save listing')}
    </button>
  )
}
