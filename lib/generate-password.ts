const WORDS = [
  'peace', 'river', 'mountain', 'sunrise', 'harmony', 'bridge', 'forest', 'ocean',
  'meadow', 'valley', 'sunset', 'dove', 'olive', 'unity', 'hope', 'light',
  'calm', 'serene', 'tranquil', 'gentle', 'kind', 'brave', 'wise', 'true'
]

export function generateTempPassword(): string {
  const w1 = WORDS[Math.floor(Math.random() * WORDS.length)]
  const w2 = WORDS[Math.floor(Math.random() * WORDS.length)]
  const num = Math.floor(Math.random() * 90) + 10 // 10-99
  // Ensure different words
  if (w1 === w2) {
    return generateTempPassword()
  }
  return `${w1}-${w2}-${num}`
}

export function generateMemberId(year: number, sequence: number): string {
  return `KHP-${year}-${String(sequence).padStart(3, '0')}`
}
