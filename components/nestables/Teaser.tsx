import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import Image from 'next/image'
import { TeaserStoryblok } from '@storyblok-component-types'
import Link from 'next/link'
import { getHref } from '../../lib/getHref'

export default function Teaser({ blok }: { blok: TeaserStoryblok }) {
  return (
    <div className="container mx-auto px-4" {...storyblokEditable(blok as unknown as SbBlokData)}>
      <div className="flex justify-between py-16 sm:py-10">
        <div className="w-full lg:w-1/2 xl:w-6/12 text-center lg:text-left py-4 sm:p-0">
          <h1 className="text-4xl xl:text-5xl text-light dark:text-dark font-medium tracking-normal leading-tight mb-6">
            {blok.headline}
          </h1>
          {blok.lead && <h2 className="text-lg font-medium mb-6">{blok.lead}</h2>}
          <div className="flex flex-col sm:block py-4">
            <Link
              href={getHref(blok.button_link)}
              target={blok.button_link.target}
              rel={blok.button_link.target === '_blank' ? 'noopener' : undefined}
              className="inline-block font-medium shadow uppercase rounded hover:shadow-md sm:mr-4 py-3 px-6 text-base mb-4 primary"
            >
              {blok.button_label}
            </Link>
          </div>
        </div>
        <div className="hidden lg:block lg:w-5/12">
          <Image
            src="https://img.storyblok.com/ESj1lIqO5N2nrvzRp8KwVCg8CtU=/1300x0/filters:format(webp):quality(80)/f/88751/1734x1092/fac47826c3/storyblok-editor.png"
            alt="Storyblok editor"
            width="644"
            height="406"
          />
        </div>
      </div>
    </div>
  )
}
