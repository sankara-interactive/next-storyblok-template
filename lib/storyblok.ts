import { apiPlugin, storyblokInit } from '@storyblok/react/rsc'
import { env } from './env'
import page from '@/components/content_types/Page'
import privacy_bee from '@/components/nestables/PrivacyBee'
import text_section from '@/components/nestables/TextSection'

export const components = {
  page,
  privacy_bee,
  text_section,
}

export const getStoryblokApi = storyblokInit({
  accessToken: env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  use: [apiPlugin],
  components,
})
