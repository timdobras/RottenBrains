interface IframeLink {
  name: string;
  template: (params: {
    media_type: string;
    media_id: string | number;
    season_number?: string;
    episode_number?: string;
  }) => string;
}

export const iframeLinks: IframeLink[] = [
  {
    name: "VidSrc.net",
    template: ({ media_type, media_id, season_number, episode_number }) => {
      const seasonSegment = season_number ? `/${season_number}` : "";
      const episodeSegment = episode_number ? `/${episode_number}` : "";
      return `https://vidsrc.net/embed/${media_type}/${media_id}${seasonSegment}${episodeSegment}`;
    },
  },
  {
    name: "VidSrc.pro",
    template: ({ media_type, media_id, season_number, episode_number }) => {
      const seasonSegment = season_number ? `/${season_number}` : "";
      const episodeSegment = episode_number ? `/${episode_number}` : "";
      return `https://vidsrc.pro/embed/${media_type}/${media_id}${seasonSegment}${episodeSegment}`;
    },
  },
  {
    name: "VidSrc.cc",
    template: ({ media_type, media_id, season_number, episode_number }) => {
      const seasonSegment = season_number ? `/${season_number}` : "";
      const episodeSegment = episode_number ? `/${episode_number}` : "";
      return `https://vidsrc.cc/v2/embed/${media_type}/${media_id}${seasonSegment}${episodeSegment}`;
    },
  },
  {
    name: "2Embed",
    template: ({ media_type, media_id, season_number, episode_number }) => {
      return `https://www.2embed.cc/embed/${media_type}/${media_id}&s=${season_number}&e=${episode_number}`;
    },
  },
  {
    name: "SuperEmbed",
    template: ({ media_type, media_id, season_number, episode_number }) => {
      const seasonEpisodeString = `&season=${season_number}&episode=${episode_number}`;
      return `/api/testapi?video_id=${media_id}&tmdb=1${
        media_type === "tv" ? seasonEpisodeString : ""
      }`;
    },
  },
];
