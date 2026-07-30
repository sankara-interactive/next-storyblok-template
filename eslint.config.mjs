import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores(['node_modules', '.yarn/**', '.storyblok/types/**']),
])

export default eslintConfig
