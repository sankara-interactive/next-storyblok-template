import { apiPlugin, storyblokInit } from '@storyblok/react/rsc'
import { env } from './env'
import page from '@/components/content_types/Page'
import feature from '@/components/nestables/Feature'
import grid from '@/components/nestables/Grid'
import privacy_bee from '@/components/nestables/PrivacyBee'
import teaser from '@/components/nestables/Teaser'

export const getStoryblokApi = storyblokInit({
  accessToken: env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  use: [apiPlugin],
  // Build workers burst past the published token's req/s cap (429 storms in
  // the build log); throttle client-side and out-retry the residual limits.
  apiOptions: { rateLimit: 4, maxRetries: 10 },
  components: {
    page,
    feature,
    grid,
    teaser,
    privacy_bee,
  },
})
