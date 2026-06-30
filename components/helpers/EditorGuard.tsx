'use client'

import { useEffect } from 'react'

// Inside the Storyblok Visual Editor (iframe + ?_storyblok), clicking links/buttons
// would navigate the iframe away from the story being edited. Swallow that: capture-phase
// preventDefault stops anchor navigation AND Next's <Link> router (it bails on defaultPrevented),
// while the click still bubbles so the bridge can select the blok. Forms are stopped too.
// ponytail: only arms in the editor — zero effect on the live site.
const inVisualEditor = () =>
  typeof window !== 'undefined' && window.self !== window.top && window.location.search.includes('_storyblok')

export default function EditorGuard() {
  useEffect(() => {
    if (!inVisualEditor()) return
    const stopClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest('a[href], button')) e.preventDefault()
    }
    const stopSubmit = (e: Event) => e.preventDefault()
    document.addEventListener('click', stopClick, true)
    document.addEventListener('submit', stopSubmit, true)
    return () => {
      document.removeEventListener('click', stopClick, true)
      document.removeEventListener('submit', stopSubmit, true)
    }
  }, [])
  return null
}
