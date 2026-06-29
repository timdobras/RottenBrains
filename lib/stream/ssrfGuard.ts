import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { logger } from '@/lib/logger';

/**
 * SSRF protection for the stream proxy.
 *
 * The proxy fetches arbitrary upstream URLs supplied (indirectly) by the
 * client. Without guarding, that is a server-side request forgery hole that
 * could be pointed at internal homelab services (10.x / 192.168.x / metadata
 * endpoints). Stream CDNs are always public, so we hard-block private,
 * loopback, link-local and unique-local address ranges.
 */

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    return false;
  }
  // IPv6
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  // IPv4-mapped IPv6 (::ffff:10.0.0.1)
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
}

/**
 * Validate that `rawUrl` is an http(s) URL whose host resolves to a public
 * address. Returns the parsed URL on success, throws on rejection.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed');
  }

  // If the host is a literal IP, check it directly.
  const hostname = url.hostname;
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('Refusing to proxy a private address');
    return url;
  }

  // Otherwise resolve all A/AAAA records and reject if ANY is private.
  let addrs: { address: string }[];
  try {
    addrs = await lookup(hostname, { all: true });
  } catch (err) {
    logger.warn('ssrfGuard: DNS lookup failed', { hostname, err });
    throw new Error('DNS resolution failed');
  }

  if (addrs.length === 0) throw new Error('Host did not resolve');
  for (const { address } of addrs) {
    if (isPrivateIp(address)) {
      throw new Error('Refusing to proxy a host that resolves to a private address');
    }
  }
  return url;
}
