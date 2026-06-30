import WatchMovieBody from '@/components/features/watch/WatchMovieBody';
import WatchOverlay from '@/components/features/watch/WatchOverlay';

type Params = Promise<{ media_id: string; media_type: string }>;

/**
 * Intercepting overlay for a MOVIE watch URL.
 *
 * A soft navigation (any <Link>/router.push) to `/protected/watch/movie/[id]`
 * is captured by this @watch slot and rendered as a fullscreen overlay on top
 * of the page you came from — which stays mounted underneath. Minimizing pops
 * the overlay (router.back) and reveals that page with scroll intact; the
 * persistent player keeps playing throughout. Hard loads / shared links are NOT
 * intercepted and fall through to the real route's page.tsx (full SSR page).
 *
 * `(.)protected` mirrors the @modal/(.)post template: the slot is at the root
 * level, so it intercepts the root-level `protected` segment.
 */
export default async function InterceptedMovieWatch({ params }: { params: Params }) {
  const { media_type, media_id } = await params;
  return (
    <WatchOverlay>
      <WatchMovieBody media_type={media_type} media_id={Number(media_id)} isOverlay />
    </WatchOverlay>
  );
}
