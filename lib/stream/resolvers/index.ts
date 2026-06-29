import type { ExtractedStream, ResolveParams, StreamResolver } from '../types';
import { externalResolver } from './external';
import { queueResolver } from './queue';
import { vidsrcCcResolver } from './vidsrccc';

/**
 * Ordered resolver chain:
 *  1. queue — BullMQ job to the rb-extractor worker (the production path)
 *  2. external — HTTP extractor microservice, if STREAM_EXTRACTOR_URL is set
 *  3. vidsrc.cc — best-effort inline scraper fallback
 * Resolvers that aren't configured return null from their factory and are skipped.
 */
function buildChain(): StreamResolver[] {
  const chain: StreamResolver[] = [];
  const queue = queueResolver();
  if (queue) chain.push(queue);
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
