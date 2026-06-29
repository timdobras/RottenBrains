// Shared types for the native (ad-free) streaming pipeline.
//
// Instead of embedding a third-party provider's ad-laden page in an <iframe>,
// we resolve the underlying HLS stream server-side and play it in our own
// hls.js player. See lib/stream/resolvers and app/api/stream/* .

export interface SubtitleTrack {
  /** Display label, e.g. "English" */
  label: string;
  /** BCP-47 language code where known, e.g. "en" */
  lang?: string;
  /** Absolute URL to a .vtt (preferred) or .srt file */
  url: string;
  /** Whether this track should be selected by default */
  default?: boolean;
}

export interface ExtractedStream {
  /** Absolute URL of the HLS master/media playlist (.m3u8) */
  url: string;
  /**
   * Headers the upstream CDN requires to serve the playlist/segments.
   * Almost always a Referer and sometimes an Origin tied to the provider.
   * These are injected by the proxy, never exposed to the browser.
   */
  headers?: Record<string, string>;
  /** Optional subtitle sidecar tracks discovered during resolution. */
  subtitles?: SubtitleTrack[];
  /** Which resolver produced this, for debugging/telemetry. */
  resolver: string;
  /** "hls" today; leaves room for "mp4" / "dash" later. */
  type: 'hls';
}

export interface ResolveParams {
  media_type: 'movie' | 'tv';
  media_id: string;
  season_number?: string;
  episode_number?: string;
}

export interface StreamResolver {
  /** Stable id, surfaced to the client as the "provider". */
  name: string;
  /** Resolve playable stream info, or null if this resolver can't serve it. */
  resolve: (params: ResolveParams) => Promise<ExtractedStream | null>;
}
