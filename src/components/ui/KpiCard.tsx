interface Props {
  label: string
  value: string | number
  sub: string
  color: string
  icon: React.ReactNode
  trend?: { value: number; label: string } | null
}

export default function KpiCard({ label, value, sub, color, icon, trend }: Props) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      {/* Acento de color arriba */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, borderRadius: '10px 10px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '11.5px', color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{label}</div>
        <div style={{ color, opacity: 0.5 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1.5px', fontFamily: 'DM Mono, monospace', color, lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <div style={{ fontSize: '11.5px', color: '#6B6A64' }}>{sub}</div>
        {trend && (
          <div style={{ fontSize: '11px', fontWeight: 600, color: trend.value >= 0 ? '#2D6A4F' : '#8B2020', background: trend.value >= 0 ? '#D8F3DC' : '#FAE0E0', padding: '2px 6px', borderRadius: '4px' }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)} {trend.label}
          </div>
        )}
      </div>
    </div>
  )
}
