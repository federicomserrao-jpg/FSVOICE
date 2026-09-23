'use client'
import { useEffect, useState } from 'react'

interface Props {
  message: string
  type?: 'success' | 'error' | 'default'
  onDone: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onDone, duration = 2800 }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, duration)
    return () => clearTimeout(t)
  }, [])

  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    default: 'ℹ',
  }

  return (
    <div className={`toast ${type}`} style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s, transform 0.3s', transform: visible ? 'translateY(0)' : 'translateY(10px)' }}>
      <span style={{ fontSize: '16px', fontWeight: 700 }}>{icons[type]}</span>
      {message}
    </div>
  )
}
