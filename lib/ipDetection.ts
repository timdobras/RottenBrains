import { logger } from '@/lib/logger';

// Cache configuration
const IP_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// In-memory cache
interface IPCacheEntry {
  ip: string;
  expiresAt: number;
}

let ipCache: IPCacheEntry | null = null;
let pendingIPRequest: Promise<string | null> | null = null;

// IP detection services
const services = [
  {
    name: 'ipify',
    url: 'https://api.ipify.org?format=json',
    parser: (data: { ip: string }) => data.ip,
  },
  {
    name: 'ipapi',
    url: 'https://ipapi.co/json/',
    parser: (data: { ip: string }) => data.ip,
  },
  {
    name: 'ipinfo',
    url: 'https://ipinfo.io/json',
    parser: (data: { ip: string }) => data.ip,
  },
];

/**
 * Fetch IP from a single service with timeout
 */
async function fetchFromService(
  service: (typeof services)[0],
  controller: AbortController
): Promise<string | null> {
  try {
    const response = await fetch(service.url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      return service.parser(data);
    }
  } catch {
    // Silently fail, will try other services
  }
  return null;
}

/**
 * Get cached IP if valid
 */
function getCachedIP(): string | null {
  if (ipCache && ipCache.expiresAt > Date.now()) {
    logger.debug('[IP Detection] Returning cached IP:', ipCache.ip);
    return ipCache.ip;
  }
  return null;
}

/**
 * Set IP in cache
 */
function setCachedIP(ip: string): void {
  ipCache = {
    ip,
    expiresAt: Date.now() + IP_CACHE_TTL_MS,
  };
}

/**
 * Clear IP cache (useful when VPN status might have changed)
 */
export function clearIPCache(): void {
  ipCache = null;
  pendingIPRequest = null;
}

/**
 * Get public IP with caching and request deduplication
 * Uses Promise.race for faster response time
 */
export async function getFreshPublicIP(): Promise<string | null> {
  // Check cache first
  const cached = getCachedIP();
  if (cached) return cached;

  // Deduplicate concurrent requests
  if (pendingIPRequest) {
    logger.debug('[IP Detection] Returning pending request');
    return pendingIPRequest;
  }

  // Create new request
  pendingIPRequest = (async () => {
    try {
      // Create abort controllers for all services
      const controllers = services.map(() => new AbortController());

      // Set timeout for all requests (2 seconds)
      const timeoutId = setTimeout(() => {
        controllers.forEach((c) => c.abort());
      }, 2000);

      // Race all services - return first successful response
      const promises = services.map(async (service, index) => {
        const ip = await fetchFromService(service, controllers[index]);
        if (ip) {
          logger.debug(`[IP Detection] ${service.name} returned: ${ip}`);
          // Abort other requests
          controllers.forEach((c, i) => {
            if (i !== index) c.abort();
          });
          return ip;
        }
        return null;
      });

      // Use Promise.any to get first successful result
      // Falls back to Promise.race with filter for older environments
      const results = await Promise.allSettled(promises);
      clearTimeout(timeoutId);

      // Find first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          setCachedIP(result.value);
          return result.value;
        }
      }

      logger.warn('[IP Detection] All services failed');
      return null;
    } finally {
      pendingIPRequest = null;
    }
  })();

  return pendingIPRequest;
}
