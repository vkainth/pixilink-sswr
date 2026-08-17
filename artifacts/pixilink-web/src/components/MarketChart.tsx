interface Props {
  data: number[]
  labels: string[]
  type?: 'line' | 'bar'
  title: string
  color?: string
  height?: number
  yPrefix?: string
  ySuffix?: string
}

/**
 * Server-rendered SVG chart (no client JS). Renders a line or bar chart from a
 * numeric series. Returns null when there is no data so empty sections hide.
 */
export default function MarketChart({
  data,
  labels,
  type = 'line',
  title,
  color = 'var(--accent)',
  height = 160,
  yPrefix = '',
  ySuffix = '',
}: Props) {
  if (!data.length) return null

  const W = 480
  const H = height
  const padL = 6
  const padR = 6
  const padT = 12
  const padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const x = (i: number) =>
    data.length === 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW
  const y = (v: number) => padT + innerH - ((v - min) / range) * innerH

  const fmt = (v: number) => `${yPrefix}${Math.round(v).toLocaleString('en-CA')}${ySuffix}`

  // Sparse x labels: first, middle, last (avoid crowding)
  const labelIdx = new Set<number>([0, Math.floor((labels.length - 1) / 2), labels.length - 1])

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
          {fmt(data[data.length - 1])}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={title}>
        {/* baseline */}
        <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="var(--border)" strokeWidth={1} />

        {type === 'bar' ? (
          data.map((v, i) => {
            const bw = (innerW / data.length) * 0.6
            const cx = x(i) - bw / 2
            const top = y(v)
            return (
              <rect
                key={i}
                x={data.length === 1 ? padL + innerW / 2 - bw / 2 : cx}
                y={top}
                width={bw}
                height={padT + innerH - top}
                rx={2}
                fill={color}
                opacity={0.85}
              />
            )
          })
        ) : (
          <>
            <polyline
              points={data.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {data.map((v, i) =>
              i === data.length - 1 ? <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={color} /> : null,
            )}
          </>
        )}

        {/* x labels */}
        {labels.map((l, i) =>
          labelIdx.has(i) ? (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              fontSize={10}
              fill="var(--text-muted)"
              textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
            >
              {l}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}
