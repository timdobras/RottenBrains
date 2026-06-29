interface IframeLink {
  name: string;
  template: (params: {
    media_type: string;
    media_id: string | number;
    season_number?: string;
    episode_number?: string;
    progress?: number; // resume position in seconds (supported by some providers)
  }) => string;
}

// Provider list pruned 2026-06-29: removed VidSrc.net (DNS dead), VidSrc.cc
// (origin 522/dead), VidSrc.pro (embed.su → error page) and 2Embed (serves a
// library landing page, no player) — all verified non-working. Kept the
// providers that still render a working player, and added VidSrc.fyi.
export const iframeLinks: IframeLink[] = [
  {
    name: 'Videasy',
    template: ({ media_type, media_id, season_number, episode_number, progress }) => {
      const seasonSegment = season_number ? `/${season_number}` : '';
      const episodeSegment = episode_number ? `/${episode_number}` : '';
      const progressParam = progress && progress > 0 ? `?progress=${Math.floor(progress)}` : '';
      return `https://player.videasy.net/${media_type}/${media_id}${seasonSegment}${episodeSegment}${progressParam}`;
    },
  },
  {
    name: 'VidSrc.fyi',
    template: ({ media_type, media_id, season_number, episode_number }) => {
      const seasonSegment = season_number ? `/${season_number}` : '';
      const episodeSegment = episode_number ? `/${episode_number}` : '';
      return `https://vidsrc.fyi/embed/${media_type}/${media_id}${seasonSegment}${episodeSegment}`;
    },
  },
  {
    name: 'SuperEmbed',
    template: ({ media_type, media_id, season_number, episode_number }) => {
      const seasonEpisodeString = `&season=${season_number}&episode=${episode_number}`;
      return `/api/testapi?video_id=${media_id}&tmdb=1${
        media_type === 'tv' ? seasonEpisodeString : ''
      }`;
    },
  },
];
