/**
 * Tamper-proof premium-status cookie.
 *
 * The middleware caches a user's premium status in a cookie to avoid a DB
 * lookup on every request. The value MUST be signed — otherwise a user can
 * simply send `Cookie: premium_status=true` and bypass the paywall.
 *
 * We HMAC-sign `${userId}.${flag}.${expiry}` with a server-only secret using
 * the Web Crypto API (Edge-runtime compatible — Node's `crypto` is not
 * available in Next.js middleware). Verification is bound to the current
 * user id and an expiry, so a token cannot be replayed across users or after
 * it lapses.
 *
 * Fail-safe: if no secret is configured we return `null` from both sign and
 * verify, which forces the caller to fall back to the authoritative DB check.
 */

const COOKIE_NAME = 'premium_status';

function getSecret(): string | null {
  return process.env.PREMIUM_COOKIE_SECRET || null;
}

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  const b = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64url(sig);
}

/** Constant-time string comparison to avoid signature timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Produce a signed cookie value for the given user. Returns `null` when no
 * secret is configured (caller should then skip setting the cookie).
 *
 * @param ttlMs how long the cached value stays valid (defaults to 5 minutes)
 */
export async function signPremiumStatus(
  userId: string,
  isPremium: boolean,
  ttlMs = 5 * 60 * 1000
): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;

  const flag = isPremium ? '1' : '0';
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${flag}.${exp}`;
  const sig = await hmac(secret, payload);
  return `${flag}.${exp}.${sig}`;
}

/**
 * Verify a signed cookie value against the current user id.
 *
 * @returns the cached premium boolean if the signature is valid and not
 *   expired, otherwise `null` (meaning "unknown — go check the DB").
 */
export async function verifyPremiumStatus(
  cookieValue: string | undefined,
  userId: string
): Promise<boolean | null> {
  const secret = getSecret();
  if (!secret || !cookieValue) return null;

  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;
  const [flag, expStr, sig] = parts;

  if (flag !== '0' && flag !== '1') return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;

  const expected = await hmac(secret, `${userId}.${flag}.${exp}`);
  if (!timingSafeEqual(sig, expected)) return null;

  return flag === '1';
}

export const PREMIUM_COOKIE_NAME = COOKIE_NAME;
