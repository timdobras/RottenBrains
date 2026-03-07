/**
 * Module-level store for Videasy player playback data.
 *
 * VideoShell writes to this via postMessage events from the Videasy iframe.
 * WatchDuration reads from this when the Videasy provider is active to get
 * accurate playback position instead of wall-clock time estimates.
 *
 * This is a simple module singleton — no React context needed since both
 * VideoShell and WatchDuration are always mounted together.
 */

export const videasyPlayback = {
  /** Current playback position in seconds */
  currentTime: 0,
  /** Total duration of the media in seconds */
  duration: 0,
  /** Whether we've received at least one message from the player */
  hasData: false,

  /** Reset when media or provider changes */
  reset() {
    this.currentTime = 0;
    this.duration = 0;
    this.hasData = false;
  },

  /** Update from a Videasy postMessage event */
  update(currentTime: number, duration?: number) {
    this.currentTime = currentTime;
    if (duration && duration > 0) {
      this.duration = duration;
    }
    this.hasData = true;
  },
};
