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
    <div style={{ background: '#fff', border: '1px solid #DDE1E6', borderRadius: '14px', padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', color: '#565D66', fontWeight: 500 }}>{label}</div>
        <div style={{ color, opacity: 0.5 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 800, fontStretch: '125%', letterSpacing: '-0.5px', color, lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <div style={{ fontSize: '11.5px', color: '#565D66' }}>{sub}</div>
        {trend && (
          <div style={{ fontSize: '11px', fontWeight: 600, color: trend.value >= 0 ? '#2D6A4F' : '#8B2020', background: trend.value >= 0 ? '#D8F3DC' : '#FAE0E0', padding: '2px 6px', borderRadius: '4px' }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)} {trend.label}
          </div>
        )}
      </div>
    </div>
  )
}
