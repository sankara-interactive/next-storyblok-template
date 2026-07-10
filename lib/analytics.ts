export function pirschAttributes(
  code?: string,
): { id: string; src: string; 'data-code': string } | null {
  if (!code) return null
  return { id: 'pirschjs', src: 'https://api.pirsch.io/pirsch.js', 'data-code': code }
}
