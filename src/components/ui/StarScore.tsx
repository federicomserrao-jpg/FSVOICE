interface Props {
  value: number | null
  max?: number
  showNumber?: boolean
}

export default function StarScore({ value, max = 5, showNumber = true }: Props) {
  if (!value) return <span style={{ color: '#9E9C95', fontSize: '13px' }}>—</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '1px' }}>
        {Array.from({ length: max }).map((_, i) => (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < value ? '#F59E0B' : 'none'} stroke={i < value ? '#F59E0B' : '#C8C6BC'} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        ))}
      </div>
      {showNumber && <span style={{ fontSize: '12px', color: '#6B6A64', fontFamily: 'DM Mono' }}>{value}/{max}</span>}
    </div>
  )
}
