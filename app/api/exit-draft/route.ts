import { draftMode } from 'next/headers'

export async function GET() {
  const draft = await draftMode()
  draft.disable()
  return new Response('Draft mode is disabled')
}
