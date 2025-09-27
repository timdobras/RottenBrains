import Link from "next/link";
import VideoEmbed from "@/components/features/watch/MediaEmbed";
import WatchDuration from "@/components/features/watch/WatchDuration";
import MediaCardSmall from "@/components/features/media/MediaCardSmall";
import { getMediaDetails, getRecommendations } from "@/lib/tmdb";
import WatchPageDetails from "@/components/features/watch/WatchPageDetails";
import NativeAd from "@/components/features/ads/Native";
import { fetchMediaData } from "@/lib/client/fetchMediaData";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import AdBanner from "@/components/features/ads/GoogleDisplayAd";
import NavAdMobile from "@/components/features/ads/NavAdMobile";
import FixedAd from "@/components/features/ads/300x250Ad";
import MobileBannerExo42 from "@/components/features/ads/Notification";
import MobileBannerExoAlt from "@/components/features/ads/Message";
import MobileBannerExo from "@/components/features/ads/MobileBannerExo";
import MobileBannerPem from "@/components/features/ads/Fullscreen";
import VideoAd from "@/components/features/ads/Video";
import VideoContextSetter from "@/hooks/VideoContextSetter";
import MediaCardServer from "@/components/features/media/MediaCardServer";

export async function generateMetadata({ params }: any) {
  const media_id = parseInt(params.media_id, 10);
  const media_type = "movie";

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
    title: `Watch ${media.title || media.name} Online Free HD | Rotten Brains`,
    description: `Stream ${media.title || media.name} now on Rotten Brains for free in HD. ${
      media.overview
    } Enjoy watching and sharing with friends today!`,
  };
}
type Params = Promise<{ media_id: number }>;
export default async function mediaPage({ params }: { params: Params }) {
  const { media_id } = await params;
  const media_type = "movie";

  const user = await getCurrentUser();

  const recommendations = await getRecommendations(media_type, media_id);
  const media = await getMediaDetails(media_type, media_id);
  if (!media) {
    return <div>NO MEDIA FOUND</div>;
  }

  // Fetch media details for recommendations
  const recommendationMediaDetails = await Promise.all(
    recommendations.results.map((rec: any) =>
      getMediaDetails(rec.media_type || "movie", rec.id),
    ),
  );

  return (
    <>
      <VideoContextSetter media_type={media_type} media_id={media_id} />
      {user && (
        <WatchDuration
          media_type={media_type}
          media_id={media_id}
          user_id={user.id}
          media_duration={media.runtime || 24}
        />
      )}
      <div className="relative mx-auto mb-16 w-full max-w-7xl">
        <div className="small-screen-watch-margin mx-auto flex w-full flex-col md:gap-4">
          <div className="flex flex-col md:w-full md:gap-4">
            <VideoEmbed />
            <WatchPageDetails
              media={media}
              media_type="movie"
              media_id={media_id}
            ></WatchPageDetails>
          </div>
          <section className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 px-4 md:gap-4 md:px-0">
            {recommendationMediaDetails.map((mediaDetail: any) => (
              <MediaCardServer
                media_type={mediaDetail.media_type || "movie"}
                media_id={mediaDetail.id}
                user_id={user?.id}
                rounded={true}
              />
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
