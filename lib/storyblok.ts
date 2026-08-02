import { apiPlugin, storyblokInit } from '@storyblok/react/rsc'
import { env } from './env'
import page from '@/components/content_types/Page'
import faq_item from '@/components/nestables/FaqItem'
import faq_section from '@/components/nestables/FaqSection'
import privacy_bee from '@/components/nestables/PrivacyBee'
import text_section from '@/components/nestables/TextSection'

export const components = {
  page,
  faq_item,
  faq_section,
  privacy_bee,
  text_section,
}

export const getStoryblokApi = storyblokInit({
  accessToken: env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  use: [apiPlugin],
  // Build workers burst past the published token's req/s cap (429 storms in
  // the build log); throttle client-side and out-retry the residual limits.
  apiOptions: { rateLimit: 4, maxRetries: 10 },
  components,
})
