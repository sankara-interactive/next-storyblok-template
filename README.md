# Next.js Storyblok Boilerplate

This repository is a Next.js [Storyblok](https://www.storyblok.com) starter template.

## Requirements

To use this project you have to have a Storyblok account. If you don't have one yet you can register at [Storyblok](https://www.storyblok.com), it's free.

## How to get started?

Read the [Next.js 13 tutorial](https://www.storyblok.com/tp/add-a-headless-cms-to-next-js-13-in-5-minutes) about connecting Storyblok and Next.js

### 1. Use this template

Create a new repository from this template by clicking the **Use this template** button.

### 2. Install all dependencies

```sh
yarn # or npm install
```

### 3. Adding the Access token

Create a new empty space and copy the preview token. Create your `.env` from `.env.example`:

```sh
mv .env.example .env
```

Add the tokens and space ID from Storyblok and the API secret as environment variables:

```sh
STORYBLOK_SPACE_ID=<your-space-id>
NEXT_PUBLIC_STORYBLOK_TOKEN=<your-public-token>
STORYBLOK_PREVIEW_TOKEN=<your-preview-token>
API_SECRET=<a-strong-random-string-used-by-api-routes>
```

In development it's recommended to use the preview token which allows you to see unpublished (draft) data. In production, use the public token for NEXT_PUBLIC_STORYBLOK_TOKEN.

### 4. Run your project

Set the preview domain in <strong>Storyblok</strong> to `http://localhost:3000/`

```sh
# to run in developer mode
yarn dev # or npm run dev
```

```sh
# to build your project
yarn build # or npm run build
```

### 5. Generate boilerplate components and TypeScript types

First, make sure you have the [Storyblok CLI](https://github.com/storyblok/storyblok-cli) set up with your account. Next, replace space ID in `tsconfig.json` paths config with your space ID e.g. `123456`.

```json
"@storyblok-component-types": ["./.storyblok/types/<your-space-id>/storyblok-components"]
```

```sh
# get current component definition
yarn pull-components
```

```sh
# generate boilerplate components
yarn generate-components
```

Whenever your component definitions have changes, you can update your types:

```sh
# generate types from component definition
yarn generate-types
```

### 6. Setup preview mode

To enable preview mode you have to add two preview URLs in Storyblok:

**Preview**
`https://<my-url>/api/draft?secret=<API_SECRET>&slug=`

**Exit Preview**
`https://<my-url>/api/exit-draft?slug=`

Don't forget to add the secret as env-variable.
It might be helpful for the end user to set the preview URL as default.

### 7. Webhook for revalidation

To revalidate pages after publishing in Storyblok, you have to set up the following Webhook URL:
`https://<my-url>/api/story-published?secret=<API_SECRET>`

Don't forget to add the same `API_SECRET` value as the `secret` query parameter in your Webhook configuration.

## Resources

- [Next.js docs](https://nextjs.org/docs/#setup)
- [Storyblok Tutorial](https://www.storyblok.com/tp/add-a-headless-cms-to-next-js-in-5-minutes)
- [Preview Mode](https://nextjs.org/docs/advanced-features/preview-mode)
