'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Perfil } from '@/types'
import Image from 'next/image'

interface SidebarProps {
  perfil: Perfil | null
}

export default function Sidebar({ perfil }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = perfil?.nombre
    ? perfil.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US'

  const navItems = [
    { section: 'Operador', items: [
      { label: 'Mis casos', href: '/dashboard', icon: TableIcon },
      { label: 'Rellamar hoy', href: '/dashboard?filtro=rellamar', icon: PhoneIcon },
    ]},
    { section: 'Supervisión', items: [
      { label: 'Dashboard', href: '/metricas', icon: GridIcon },
      ...(perfil?.rol === 'admin' ? [{ label: 'Gestión admin', href: '/admin', icon: SettingsIcon }] : []),
    ]},
  ]

  return (
    <nav style={{ width: '240px', flexShrink: 0, background: '#1A1917', color: '#F5F4F0', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Image src="/logo-carone.png" alt="Car One" width={36} height={36} style={{ borderRadius: '8px', flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.3px', display: 'block' }}>FSVOICE</span>
          <small style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Car One</small>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 0' }}>
        {navItems.map(group => (
          <div key={group.section}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.4, padding: '12px 20px 6px', fontFamily: 'DM Mono, monospace' }}>{group.section}</div>
            {group.items.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <button key={item.href} onClick={() => router.push(item.href)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 20px', width: '100%', background: active ? 'rgba(255,255,255,0.14)' : 'none', border: 'none', color: '#F5F4F0', cursor: 'pointer', fontSize: '13.5px', opacity: active ? 1 : 0.7, fontWeight: active ? 500 : 400, textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }}>
                  <Icon size={16} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* User */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <strong style={{ fontSize: '12.5px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil?.nombre || 'Usuario'}</strong>
          <span style={{ fontSize: '11px', opacity: 0.5, textTransform: 'capitalize' }}>{perfil?.rol}</span>
        </div>
        <button onClick={handleLogout} title="Cerrar sesión"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1 }}>↪</button>
      </div>
    </nav>
  )
}

function TableIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="19"/></svg>
}
function PhoneIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2H7a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012-.5c.9.3 1.9.5 2.9.7A2 2 0 0122 16.9z"/></svg>
}
function GridIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function SettingsIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
}
