import { apiPlugin, storyblokInit } from '@storyblok/react/rsc'
import { env } from './env'
import page from '@/components/content_types/Page'
import faq_item from '@/components/nestables/FaqItem'
import faq_section from '@/components/nestables/FaqSection'
import gallery_section from '@/components/nestables/GallerySection'
import privacy_bee from '@/components/nestables/PrivacyBee'
import text_section from '@/components/nestables/TextSection'

export const components = {
  page,
  faq_item,
  faq_section,
  gallery_section,
  privacy_bee,
  text_section,
}

export const getStoryblokApi = storyblokInit({
  accessToken: env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  use: [apiPlugin],
  // Throttle API requests and retry residual rate-limit failures.
  apiOptions: { rateLimit: 4, maxRetries: 10 },
  components,
})
