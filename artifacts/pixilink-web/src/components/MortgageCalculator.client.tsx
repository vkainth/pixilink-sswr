'use client'

import { useState } from 'react'

interface Props {
  price: number
  strataFee?: number | null
  taxAmount?: number | null
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-CA')}`
}

const rangeStyles = `
.pxl-range {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 100%;
  height: 28px;
  margin: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  touch-action: pan-y;
}
.pxl-range:focus { outline: none; }
.pxl-range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 999px;
  background: var(--border, #d1d5db);
}
.pxl-range::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background: var(--border, #d1d5db);
}
.pxl-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  margin-top: -10px;
  border-radius: 50%;
  background: var(--accent, #c8a45c);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.pxl-range::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent, #c8a45c);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.pxl-range:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(200,164,92,0.4), 0 1px 4px rgba(0,0,0,0.3);
}
.pxl-range:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px rgba(200,164,92,0.4), 0 1px 4px rgba(0,0,0,0.3);
}
`

export default function MortgageCalculator({ price, strataFee, taxAmount }: Props) {
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(5.0)
  const [years, setYears] = useState(25)

  const safePrice = price > 0 ? price : 0
  const down = Math.round((safePrice * downPct) / 100)
  const principal = safePrice - down
  const monthlyRate = rate / 100 / 12
  const n = years * 12

  const pAndI = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    : principal / n

  const monthlyTax = taxAmount ? taxAmount / 12 : 0
  const monthlyStrata = strataFee ?? 0
  const total = pAndI + monthlyTax + monthlyStrata

  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }

  if (safePrice === 0) return null

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }}>
      <style>{rangeStyles}</style>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: 'var(--primary-bg)' }}>Mortgage Calculator</h2>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Estimate your monthly payment</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px', marginBottom: 22 }}>
        <div>
          <div style={labelStyle}><span>Down payment</span><span style={{ color: 'var(--text)', fontWeight: 700 }}>{downPct}% · {money(down)}</span></div>
          <input className="pxl-range" type="range" min={5} max={50} step={1} value={downPct} onChange={e => setDownPct(Number(e.target.value))} aria-label="Down payment percentage" />
        </div>
        <div>
          <div style={labelStyle}><span>Interest rate</span><span style={{ color: 'var(--text)', fontWeight: 700 }}>{rate.toFixed(2)}%</span></div>
          <input className="pxl-range" type="range" min={1} max={10} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value))} aria-label="Interest rate" />
        </div>
        <div>
          <div style={labelStyle}><span>Amortization</span><span style={{ color: 'var(--text)', fontWeight: 700 }}>{years} years</span></div>
          <input className="pxl-range" type="range" min={5} max={30} step={5} value={years} onChange={e => setYears(Number(e.target.value))} aria-label="Amortization in years" />
        </div>
        <div>
          <div style={labelStyle}><span>Mortgage amount</span></div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)' }}>{money(principal)}</div>
        </div>
      </div>

      <div style={{ background: 'var(--off-white)', borderRadius: 8, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Estimated monthly payment</span>
          <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)' }}>{money(total)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Principal &amp; interest</span><span>{money(pAndI)}/mo</span></div>
          {monthlyStrata > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Strata fee</span><span>{money(monthlyStrata)}/mo</span></div>}
          {monthlyTax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Property tax (est.)</span><span>{money(monthlyTax)}/mo</span></div>}
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
        Estimates only. Actual rates and payments vary by lender and qualification. Not a mortgage offer.
      </div>
    </div>
  )
}
