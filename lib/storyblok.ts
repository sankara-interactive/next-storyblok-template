import { apiPlugin, storyblokInit } from '@storyblok/react/rsc'
import { env } from './env'
import page from '@/components/content_types/Page'
import feature from '@/components/nestables/Feature'
import grid from '@/components/nestables/Grid'
import privacy_bee from '@/components/nestables/PrivacyBee'
import teaser from '@/components/nestables/Teaser'
import text_section from '@/components/nestables/TextSection'

export const components = {
  page,
  feature,
  grid,
  teaser,
  privacy_bee,
  text_section,
}

export const getStoryblokApi = storyblokInit({
  accessToken: env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  use: [apiPlugin],
  components,
})
