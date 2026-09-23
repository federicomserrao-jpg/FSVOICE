'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

function CarAnimation({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'driving'|'done'>('driving')

  useEffect(() => {
    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 4 + 2
      if (p >= 100) {
        p = 100
        setProgress(100)
        setPhase('done')
        clearInterval(interval)
        setTimeout(onDone, 600)
      } else {
        setProgress(p)
      }
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F5F4F0', zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: phase === 'done' ? 'fade-out 0.5s ease forwards' : undefined,
    }}>
      <style>{`
        @keyframes fade-out { to { opacity: 0; } }
        @keyframes bounce-in { 0% { opacity:0; transform: scale(0.7); } 60% { transform: scale(1.08); } 100% { opacity:1; transform: scale(1); } }
        @keyframes road-move { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes car-enter { from { left: -140px; } to { left: calc(var(--car-pos)); } }
        @keyframes wheel-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes exhaust { 0%,100% { opacity:0.6; transform: scale(1); } 50% { opacity:0.2; transform: scale(1.4) translateX(-4px); } }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: '40px', animation: 'bounce-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both', textAlign: 'center' }}>
        <Image src="/logo-carone.png" alt="Car One" width={60} height={60} style={{ borderRadius: '12px', display: 'block', margin: '0 auto 10px' }} />
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A1917', letterSpacing: '-0.3px' }}>CAR ONE</div>
        <div style={{ fontSize: '11px', color: '#9E9C95', fontFamily: 'DM Mono, monospace', letterSpacing: '0.8px', marginTop: '2px' }}>GESTIÓN CSAT</div>
      </div>

      {/* Escena del auto */}
      <div style={{ width: '380px', position: 'relative', marginBottom: '28px' }}>

        {/* Cielo / fondo */}
        <div style={{ height: '80px', background: 'linear-gradient(180deg, #E8F4FD 0%, #F5F4F0 100%)', borderRadius: '12px 12px 0 0', overflow: 'hidden', position: 'relative' }}>
          {/* Sol */}
          <div style={{ position: 'absolute', top: '14px', right: '40px', width: '28px', height: '28px', borderRadius: '50%', background: '#FCD34D', boxShadow: '0 0 20px #FCD34D80' }} />
          {/* Nubes */}
          {[{x:30,y:16,w:50},{x:100,y:22,w:35},{x:220,y:12,w:60}].map((c,i) => (
            <div key={i} style={{ position: 'absolute', top: c.y, left: c.x, width: c.w, height: 16, background: '#fff', borderRadius: '20px', opacity: 0.8 }} />
          ))}
        </div>

        {/* Ruta */}
        <div style={{ height: '48px', background: '#4B5563', position: 'relative', overflow: 'hidden' }}>
          {/* Líneas de ruta animadas */}
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '200%', display: 'flex', gap: '24px', animation: 'road-move 0.6s linear infinite' }}>
            {Array.from({length: 20}).map((_,i) => (
              <div key={i} style={{ width: '32px', height: '4px', background: '#FCD34D', borderRadius: '2px', flexShrink: 0 }} />
            ))}
          </div>

          {/* Auto SVG */}
          <div style={{
            position: 'absolute',
            bottom: '6px',
            left: `${Math.min(progress * 1.8 + 20, 220)}px`,
            transition: 'left 0.06s linear',
            width: '100px',
          }}>
            {/* Humo de escape */}
            <div style={{ position: 'absolute', left: '-12px', top: '8px', display: 'flex', gap: '3px' }}>
              {[8,5,3].map((s,i) => (
                <div key={i} style={{ width: s, height: s, borderRadius: '50%', background: '#9CA3AF', opacity: 0.5, animation: `exhaust ${0.4+i*0.15}s ease infinite`, animationDelay: `${i*0.1}s` }} />
              ))}
            </div>

            {/* Cuerpo del auto */}
            <svg viewBox="0 0 100 42" width="100" height="42" style={{ display: 'block' }}>
              {/* Cuerpo principal */}
              <rect x="5" y="18" width="90" height="18" rx="4" fill="#1A1917"/>
              {/* Techo */}
              <path d="M25 18 Q30 6 45 6 L65 6 Q78 6 82 18 Z" fill="#2d2b29"/>
              {/* Ventanas */}
              <path d="M32 17 Q35 9 44 9 L55 9 L52 17 Z" fill="#60A5FA" opacity="0.8"/>
              <path d="M57 17 L61 9 L70 9 Q76 9 78 17 Z" fill="#60A5FA" opacity="0.8"/>
              {/* Divider ventana */}
              <line x1="56" y1="9" x2="54" y2="17" stroke="#1A1917" strokeWidth="1.5"/>
              {/* Faros delanteros */}
              <ellipse cx="91" cy="24" rx="4" ry="3" fill="#FCD34D" opacity="0.9"/>
              <ellipse cx="91" cy="24" rx="6" ry="4" fill="#FCD34D" opacity="0.2"/>
              {/* Faros traseros */}
              <rect x="6" y="22" width="5" height="5" rx="1" fill="#EF4444" opacity="0.8"/>
              {/* Rueda delantera */}
              <circle cx="75" cy="36" r="7" fill="#374151"/>
              <circle cx="75" cy="36" r="4" fill="#6B7280" style={{ transformOrigin: '75px 36px', animation: 'wheel-spin 0.3s linear infinite' }}/>
              <circle cx="75" cy="36" r="1.5" fill="#9CA3AF"/>
              {/* Rueda trasera */}
              <circle cx="28" cy="36" r="7" fill="#374151"/>
              <circle cx="28" cy="36" r="4" fill="#6B7280" style={{ transformOrigin: '28px 36px', animation: 'wheel-spin 0.3s linear infinite' }}/>
              <circle cx="28" cy="36" r="1.5" fill="#9CA3AF"/>
              {/* Detalles */}
              <rect x="10" y="27" width="15" height="2" rx="1" fill="#4B5563"/>
            </svg>
          </div>
        </div>

        {/* Vereda */}
        <div style={{ height: '10px', background: '#D1D5DB', borderRadius: '0 0 12px 12px' }}>
          <div style={{ height: '3px', background: '#9CA3AF', borderRadius: '0 0 2px 2px' }} />
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{ width: '320px', marginBottom: '12px' }}>
        <div style={{ background: '#E2E0D8', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #1A1917, #4B5563)', borderRadius: '100px', width: `${progress}%`, transition: 'width 0.06s linear' }} />
        </div>
      </div>

      <div style={{ fontSize: '12px', color: '#9E9C95', fontFamily: 'DM Mono, monospace' }}>
        {progress < 40 ? 'Verificando credenciales...' : progress < 75 ? 'Cargando datos...' : progress < 95 ? 'Preparando el sistema...' : '¡Listo!'}
      </div>

      <div style={{ position: 'absolute', bottom: '24px', fontSize: '10px', color: '#C8C6BC', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px' }}>
        NEXHR · Desarrollos
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCar, setShowCar] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    } else {
      setShowCar(true) // Mostrar animación del auto
    }
  }

  function handleAnimationDone() {
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      {showCar && <CarAnimation onDone={handleAnimationDone} />}

      <main style={{ minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Image src="/logo-carone.png" alt="Car One" width={80} height={80} style={{ borderRadius: '14px', display: 'block', margin: '0 auto 14px auto' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', color: '#1A1917', margin: 0 }}>CAR ONE</h1>
            <p style={{ fontSize: '12px', color: '#9E9C95', marginTop: '4px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Gestión CSAT</p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0' }}>Iniciar sesión</h2>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B6A64', marginBottom: '4px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoFocus
                  style={{ width: '100%', background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '9px 12px', fontSize: '13.5px', color: '#1A1917', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B6A64', marginBottom: '4px' }}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  style={{ width: '100%', background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '9px 12px', fontSize: '13.5px', color: '#1A1917', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' as const }} />
              </div>
              {error && (
                <div style={{ background: '#FAE0E0', border: '1px solid #F09595', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#8B2020', marginBottom: '16px' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                style={{ width: '100%', height: '42px', background: '#1A1917', color: '#F5F4F0', border: 'none', borderRadius: '7px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.15s' }}>
                {loading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#C8C6BC', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px' }}>
            NEXHR Desarrollos · Gestión CSAT
          </p>
        </div>
      </main>
    </>
  )
}
