export function storyblokImageDimensions(url: string): { width: number; height: number } | null {
  const match = url.match(/\/(\d+)x(\d+)\//)
  if (!match) return null
  return { width: Number(match[1]), height: Number(match[2]) }
}

export function storyblokImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  return `${src}/m/${width}x0/filters:format(webp):quality(${quality ?? 75})`
}
