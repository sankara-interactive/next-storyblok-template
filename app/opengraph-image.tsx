import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_URL } from '@/lib/config'

export const alt = SITE_NAME
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The starter card: site name and host. A site replaces this with its own artwork.
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 80,
        background: '#ffffff',
        color: '#1f2933',
      }}
    >
      <div style={{ fontSize: 72, textAlign: 'center', lineHeight: 1.2 }}>{SITE_NAME}</div>
      <div style={{ fontSize: 32, color: '#6b7280' }}>{new URL(SITE_URL).host}</div>
    </div>,
    size
  )
}
