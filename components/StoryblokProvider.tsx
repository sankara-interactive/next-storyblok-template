'use client'

import { useEffect } from 'react'

export default function StoryblokProvider({
  bridge,
  children,
}: {
  bridge: boolean
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!bridge) return
    import('@/lib/storyblok').then(({ getStoryblokApi }) => {
      getStoryblokApi()
    })
  }, [bridge])
  return children
}
