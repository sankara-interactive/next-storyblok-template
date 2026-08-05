'use client'

import { Button, Popover } from '@sankara-ui/core'
import type { ReactNode } from 'react'

export function FootnotePopover({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover
      trigger={<Button className="rounded-card border px-2 py-0.5 text-sm">{label}</Button>}
      placement="top-start"
      className="p-4"
    >
      {children}
    </Popover>
  )
}
