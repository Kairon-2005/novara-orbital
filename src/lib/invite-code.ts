// Generates a 6-character alphanumeric invite code.
// Excludes ambiguous characters: 0, O, I, l, 1

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}
