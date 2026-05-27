import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FSVOICE – Car One',
  description: 'Sistema de gestión de encuestas CSAT – Car One',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
