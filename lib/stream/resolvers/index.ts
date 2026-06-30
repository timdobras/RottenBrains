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
  const chain = buildChain();
  // A forced provider is only meaningful to the queue/worker resolver; the other
  // fallbacks ignore it and would return a different source, so skip them.
  const resolvers = params.provider ? chain.filter((r) => r.name === 'queue') : chain;
  for (const resolver of resolvers) {
    const result = await resolver.resolve(params);
    if (result?.url) return result;
  }
  return null;
}
