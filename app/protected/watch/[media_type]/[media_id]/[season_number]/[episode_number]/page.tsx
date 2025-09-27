import Link from "next/link";
import VideoEmbed from "@/components/features/watch/MediaEmbed";
import WatchDuration from "@/components/features/watch/WatchDuration";
import ScrollButtons from "@/components/common/ScrollButtons";
import MediaCardSmall from "@/components/features/media/MediaCardSmall";
import { getEpisodeDetails, getMediaDetails } from "@/lib/tmdb";
import WatchPageDetails from "@/components/features/watch/WatchPageDetails";
import NativeAd from "@/components/features/ads/Native";
import { fetchMediaData } from "@/lib/client/fetchMediaData";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import TVShowDetails from "@/components/features/watch/TVSeasons";
import AdBanner from "@/components/features/ads/GoogleDisplayAd";
import NavAdMobile from "@/components/features/ads/NavAdMobile";
import FixedAd from "@/components/features/ads/300x250Ad";
import MobileBannerExo from "@/components/features/ads/MobileBannerExo";
import MobileBannerExo42 from "@/components/features/ads/Notification";
import MobileBannerExoAlt from "@/components/features/ads/Message";
import MobileBannerPem from "@/components/features/ads/Fullscreen";
import VideoAd from "@/components/features/ads/Video";
import MediaCardServer from "@/components/features/media/MediaCardServer";
import VideoContextSetter from "@/hooks/VideoContextSetter";
type Params = Promise<{
  media_id: number;
  season_number: number;
  episode_number: number;
  media_type: string;
}>;

export async function generateMetadata({ params }: { params: Params }) {
  const { media_id } = await params;
  const { media_type } = await params;
  const { season_number } = await params;
  const { episode_number } = await params;

  let mediaData;
  try {
    mediaData = await fetchMediaData(media_type, media_id);
  } catch (error) {
    console.error("Error fetching media data:", error);
    mediaData = null;
  }
  const media = mediaData;

  if (!media) {
    return {
      title: "No Media Found",
      description:
        "Connect with fellow enthusiasts and dive deep into your favorite media.",
    };
  }

  return {
    title: `Watch ${media.name} - S${season_number}E${episode_number} Online Free HD | Rotten Brains`,
    description: `Stream ${media.name} Season ${season_number} Episode ${episode_number} for free in HD on Rotten Brains. ${media.overview} Share and review with friends today!`,
  };
}

export default async function mediaPage({ params }: { params: Params }) {
  const { media_id } = await params;
  const { media_type } = await params;
  const { season_number } = await params;
  const { episode_number } = await params;

  console.log(media_type, media_id, season_number, episode_number);

  const user = await getCurrentUser();
  const media = await getMediaDetails(media_type, media_id);
  if (!media) {
    return <div>NO MEDIA FOUND</div>;
  }
  const episode = await getEpisodeDetails(
    media_id,
    season_number,
    episode_number,
  );

  let nextEpisode = null;

  if (media && media.seasons) {
    // Find next episode
    const seasons = media.seasons.filter(
      (season: { season_number: number }) => season.season_number !== 0,
    );

    const currentSeasonIndex = seasons.findIndex(
      (season: { season_number: number }) =>
        season.season_number === Number(season_number),
    );

    const currentSeason = seasons[Number(currentSeasonIndex)];

    if (currentSeason && episode_number < currentSeason.episode_count) {
      // Next episode in the same season
      nextEpisode = await getEpisodeDetails(
        media.id,
        season_number,
        Number(episode_number) + 1,
      );
    } else if (currentSeasonIndex + 1 < seasons.length) {
      // First episode of the next season
      const nextSeasonNumber = seasons[currentSeasonIndex + 1].season_number;
      nextEpisode = await getEpisodeDetails(media.id, nextSeasonNumber, 1);
    }
  }

  return (
    <>
      <VideoContextSetter
        media_type={media_type}
        media_id={media_id}
        season_number={season_number}
        episode_number={episode_number}
      />
      {user && (
        <WatchDuration
          media_type={media_type}
          media_id={media_id}
          season_number={season_number}
          episode_number={episode_number}
          user_id={user.id}
          media_duration={episode.runtime || 100}
        />
      )}
      <div className="relative mx-auto mb-16 w-full max-w-7xl">
        <div
          className={`small-screen-watch-margin mx-auto flex w-full flex-col md:gap-4`}
        >
          <div className="flex flex-col md:w-full md:gap-4">
            <VideoEmbed />
            <WatchPageDetails
              media={media}
              media_type="tv"
              media_id={media.id}
              season_number={season_number}
              episode_number={episode_number}
              episode={episode}
            ></WatchPageDetails>
          </div>
          <section className="flex flex-col gap-2 md:mt-0">
            {nextEpisode && (
              <div className="flex flex-col gap-2 md:rounded-[8px] md:p-0">
                <Link
                  href={`/protected/watch/tv/${media.id}/${nextEpisode.season_number}/${nextEpisode.episode_number}`}
                  className="px-4 md:px-0"
                >
                  <MediaCardServer
                    media_type={"tv"}
                    media_id={media.id}
                    season_number={nextEpisode.season_number}
                    episode_number={nextEpisode.episode_number}
                    user_id={user?.id.toString()}
                    rounded={true}
                  />
                </Link>
              </div>
            )}
            {media_type === "tv" && season_number && (
              <TVShowDetails
                tv_show_id={media_id}
                season_number={season_number}
                user_id={user?.id.toString()}
                is_premium={user?.premium}
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
