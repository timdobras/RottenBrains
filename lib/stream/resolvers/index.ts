import type { ExtractedStream, ResolveParams, StreamResolver } from '../types';
import { externalResolver } from './external';
import { vidsrcCcResolver } from './vidsrccc';

/**
 * Ordered resolver chain. External extractor (if configured) is tried first
 * because it's the maintainable path; inline scrapers are best-effort fallbacks.
 */
function buildChain(): StreamResolver[] {
  const chain: StreamResolver[] = [];
  const external = externalResolver();
  if (external) chain.push(external);
  chain.push(vidsrcCcResolver);
  return chain;
}

/** Try each resolver in order; return the first playable stream. */
export async function resolveStream(params: ResolveParams): Promise<ExtractedStream | null> {
  for (const resolver of buildChain()) {
    const result = await resolver.resolve(params);
    if (result?.url) return result;
  }
  return null;
}
