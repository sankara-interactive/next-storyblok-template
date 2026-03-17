import { defineConfig } from 'storyblok/config'

export default defineConfig({
  space: process.env.STORYBLOK_SPACE_ID ?? "202685",
  region: 'eu',
})
