import crypto from 'node:crypto'

const N = 16384
const R = 8
const P = 1
const KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(password, salt, KEYLEN, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) {
    crypto.scryptSync(password, 'x'.repeat(16), KEYLEN, { N, r: R, p: P })
    return false
  }
  const parts = storedHash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltB64, hashB64] = parts
  const salt = Buffer.from(saltB64!, 'base64')
  const expected = Buffer.from(hashB64!, 'base64')
  const actual = crypto.scryptSync(password, salt, KEYLEN, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

export function validatePasswordStrength(password: string): { ok: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters long.' }
  }
  if (password.length > 160) {
    return { ok: false, error: 'Password cannot exceed 160 characters.' }
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { ok: false, error: 'Password must include both letters and at least one number.' }
  }
  return { ok: true }
}

export function generateSessionToken(): { token: string; tokenHash: string } {
  const token = 'swk_sess_' + crypto.randomBytes(28).toString('base64url')
  const tokenHash = hashSessionToken(token)
  return { token, tokenHash }
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
