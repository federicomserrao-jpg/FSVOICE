export default function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #DDE1E6', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ background: '#F3F5F7', padding: '10px 14px', borderBottom: '1px solid #DDE1E6', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 0.8fr 0.8fr 0.5fr 0.5fr', gap: '16px' }}>
        {['Cliente','Concesionaria','Vehículo','F. compra','Estado','Score',''].map(h => (
          <div key={h} style={{ fontSize: '12.5px', fontWeight: 500, color: '#727A84' }}>{h}</div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: '13px 14px', borderBottom: '1px solid #DDE1E6', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 0.8fr 0.8fr 0.5fr 0.5fr', gap: '16px', alignItems: 'center' }}>
          <div>
            <div className="skeleton" style={{ height: '14px', width: `${60 + Math.random() * 30}%`, marginBottom: '6px' }} />
            <div className="skeleton" style={{ height: '11px', width: '40%' }} />
          </div>
          <div className="skeleton" style={{ height: '13px', width: '70%' }} />
          <div className="skeleton" style={{ height: '13px', width: '80%' }} />
          <div className="skeleton" style={{ height: '13px', width: '60%' }} />
          <div className="skeleton" style={{ height: '22px', width: '80px', borderRadius: '20px' }} />
          <div className="skeleton" style={{ height: '13px', width: '30px' }} />
          <div className="skeleton" style={{ height: '28px', width: '72px', borderRadius: '6px' }} />
        </div>
      ))}
    </div>
  )
}
