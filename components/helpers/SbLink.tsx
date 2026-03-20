import type { StoryblokMultilink } from '@/.storyblok/types/storyblok'
import { getHref } from '@/lib/getHref'
import Link from 'next/link'
import type { HTMLAttributes, ReactNode } from 'react'

export function SbLink({
  link,
  children,
  ...props
}: {
  link: StoryblokMultilink
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>) {
  return (
    <Link
      href={getHref(link)}
      target={link.target}
      rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </Link>
  )
}
