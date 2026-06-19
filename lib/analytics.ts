export function pirschAttributes(
  code?: string,
): { id: string; src: string; 'data-code': string } | null {
  if (!code) return null
  return { id: 'pianjs', src: 'https://api.pirsch.io/pa.js', 'data-code': code }
}
