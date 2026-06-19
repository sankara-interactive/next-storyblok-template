import { apiPlugin, storyblokInit } from '@storyblok/react/rsc'
// content types
import page from '@/components/content_types/Page'
// nestables
import feature from '@/components/nestables/Feature'
import grid from '@/components/nestables/Grid'
import privacyBee from '@/components/nestables/PrivacyBee'
import teaser from '@/components/nestables/Teaser'

export const getStoryblokApi = storyblokInit({
  accessToken: process.env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  use: [apiPlugin],
  components: {
    page,
    feature,
    grid,
    teaser,
    privacyBee,
  },
})
