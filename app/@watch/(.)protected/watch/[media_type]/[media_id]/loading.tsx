import VideoEmbed from '@/components/features/watch/MediaEmbed';
import WatchOverlay from '@/components/features/watch/WatchOverlay';
import WatchPageWrapper from '@/components/features/watch/WatchPageWrapper';

// Minimal loading state for the @watch overlay: just the background surface plus
// the player slot (so the persistent player lands on the exact placeholder while
// the content streams in). NO skeleton shimmer — the real content simply fades
// in when it's ready, which reads cleaner than placeholder boxes.
export default function WatchOverlayLoading() {
  return (
    <WatchOverlay>
      <WatchPageWrapper>
        <VideoEmbed />
      </WatchPageWrapper>
    </WatchOverlay>
  );
}
