interface SparklineProps {
  values: number[]
  color?: string
  width?: number
  height?: number
}

/**
 * Server-renderable inline SVG sparkline (no client JS).
 * Plots a polyline with a filled terminal circle.
 * Falls back gracefully when fewer than 2 data points.
 */
export default function Sparkline({
  values,
  color = 'var(--accent)',
  width = 72,
  height = 28,
}: SparklineProps) {
  if (!values || values.length < 2) {
    if (values?.length === 1) {
      return (
        <svg width={width} height={height} style={{ display: 'block' }}>
          <circle cx={width / 2} cy={height / 2} r={3} fill={color} />
        </svg>
      )
    }
    return null
  }

  const mn = Math.min(...values)
  const mx = Math.max(...values)
  const range = mx - mn || 1

  const pad = 2
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const x = (i: number) => pad + (i / (values.length - 1)) * innerW
  const y = (v: number) => pad + innerH - ((v - mn) / range) * innerH * 0.85 - innerH * 0.05

  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values.length - 1

  return (
    <svg width={width} height={height} style={{ display: 'block' }} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(last)} cy={y(values[last])} r={3} fill={color} />
    </svg>
  )
}
