import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Grupo Antelo · Gestión CSAT', description: 'Sistema de gestión CSAT' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>
}
