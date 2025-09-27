import GoBackArrow from "@/components/features/navigation/GoBackArrow";
import { getMediaCredits, getMediaDetails, getVideos } from "@/lib/tmdb";
import Link from "next/link";
import MoreOptions from "@/components/features/media/MoreOptions";
import ImageWithFallback from "@/components/features/media/ImageWithFallback";
import { fetchMediaData } from "@/lib/client/fetchMediaData";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import { transformRuntime } from "@/lib/utils";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}

export async function generateMetadata({ params }: any) {
  const media_id = parseInt(params.media_id, 10);
  const media_type = params.media_type;

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
    title: `${media.title || media.name} - RottenBrains`,
    description: `${media.overview}`,
  };
}

async function getTrailerOrFirstFive(media_type: string, media_id: number) {
  const mediaVideos = await getVideos(media_type, media_id);

  const trailers = mediaVideos.results.filter(
    (video: any) => video.type === "Trailer",
  );

  if (trailers.length > 0) {
    return trailers;
  } else {
    if (mediaVideos && mediaVideos.length > 0) {
      return mediaVideos.slice(0, 5);
    } else {
      return;
    }
  }
}

async function separateCredits(media_type: string, media_id: number) {
  const mediaCredits = await getMediaCredits(media_type, media_id);

  let directorOrCreator: any | null = null;
  let writers: any[] | null = null;
  let actors: any[] | null = null;

  // Find director or creator
  const director = mediaCredits.crew.find(
    (member: any) => member.job === "Director",
  );
  const creator = mediaCredits.crew.find(
    (member: any) => member.job === "Creator",
  );
  if (director) {
    directorOrCreator = director;
  } else if (creator) {
    directorOrCreator = creator;
  }

  // Find writers
  const writersList = mediaCredits.crew.filter(
    (member: any) => member.department === "Writing",
  );
  if (writersList.length > 0) {
    writers = writersList.map((writer: any) => writer);
  }

  // Find actors
  if (mediaCredits.cast.length > 0) {
    actors = mediaCredits.cast.map((actor: any) => actor);
  }

  return {
    directorOrCreator,
    writers,
    actors,
  };
}

type Params = Promise<{ media_id: number; media_type: string }>;

export default async function mediaPage({ params }: { params: Params }) {
  const { media_id } = await params;
  const { media_type } = await params;
  let mediaData;
  try {
    mediaData = await getMediaDetails(media_type, media_id);
  } catch (error) {
    console.error("Error fetching media data:", error);
    mediaData = null;
  }
  const media = mediaData;
  if (!media) {
    return <h1>No Media Found</h1>;
  }

  const user = await getCurrentUser();

  // let postsOfMedia: any = [];
  // if (user) {
  //   postsOfMedia = await getPostsOfMedia(user.id, media_type, media_id, 0);
  // }
  const mediaCredits = await separateCredits(media_type, media_id);

  const watchLink =
    media_type === "movie"
      ? `/protected/watch/${media_type}/${media.id}`
      : `/protected/watch/${media_type}/${media.id}/1/1`;

  let genreIds = [];
  if (media?.genres && Array.isArray(media.genres)) {
    genreIds = media.genres.map((genre: any) => genre.id);
  }

  return (
    <div className="relative md:w-full">
      <div className="fixed top-0 z-20 flex h-10 w-full flex-row items-center gap-4 bg-background px-4 backdrop-blur-xl md:hidden">
        <GoBackArrow />
        <p className="truncate">{media.title || media.name}</p>
      </div>
      <div className="relative h-auto w-screen md:w-auto">
        <div
          className="relative mt-10 flex h-auto w-screen md:mt-0 md:w-auto"
          id="overview"
        >
          <div className="mx-auto flex h-full w-screen flex-col gap-2 px-2 md:w-auto md:gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex w-full flex-row justify-between">
                <p className="text-2xl">{media.title || media.name}</p>
                {/* <MoreOptions
                  user_id={user.id}
                  media_type={media_type}
                  media_id={media_id}
                  genre_ids={genreIds}
                ></MoreOptions> */}
              </div>
              {media.tagline && (
                <p className="text-sm italic opacity-50">"{media.tagline}"</p>
              )}
              <div className="">
                <div className="flex h-full flex-col justify-between gap-2 md:flex-row md:items-center">
                  <div className="flex flex-row items-center gap-4 text-sm opacity-50">
                    <p className="">
                      {(media.release_date && media.release_date.slice(0, 4)) ||
                        media.first_air_date.slice(0, 4)}
                    </p>
                    {media_type === "tv" && (
                      <>
                        <div className="h-2 w-2 rounded-full bg-foreground"></div>
                        <p>TV-{media.number_of_seasons}</p>
                      </>
                    )}
                    <div className="h-2 w-2 rounded-full bg-foreground"></div>
                    <p>
                      {media_type === "movie"
                        ? transformRuntime(media.runtime)
                        : transformRuntime(media.episode_run_time)}
                    </p>
                  </div>
                  <div className="flex h-full flex-row items-center justify-between gap-4">
                    <Link
                      href={`/protected/create-post/${media_type}/${media_id}`}
                      className="z-10 flex flex-row items-center gap-2 rounded-[8px] bg-foreground/10 px-6 py-2 drop-shadow-lg hover:scale-105"
                    >
                      <img
                        src="/assets/icons/star-outline.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="invert-on-dark"
                        loading="lazy"
                      />
                      <p className="text-sm">Rate</p>
                    </Link>
                    <div className="flex flex-row items-center gap-2 rounded-[8px] bg-foreground/20 px-6 py-2 drop-shadow-lg">
                      <img
                        src="/assets/icons/star-solid.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="invert-on-dark"
                        loading="lazy"
                      />
                      <p className="text-sm text-foreground/50">
                        <span className="text-foreground/100">
                          {media.vote_average.toFixed(1)}
                        </span>
                        /10 <span>({formatNumber(media.vote_count)})</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex h-auto flex-col gap-4 md:h-[50vh] md:flex-row md:gap-8">
              <div className="h-full">
                <img
                  src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                  alt=""
                  className="h-full rounded-[4px] drop-shadow-lg"
                />
              </div>
              <div className="relative h-full">
                <Link
                  className="absolute bottom-0 z-10 m-4 flex flex-row items-center gap-2 rounded-[8px] bg-black/20 px-6 py-2 drop-shadow-lg backdrop-blur-lg hover:scale-105"
                  href={watchLink}
                >
                  <img
                    src="/assets/icons/play-solid.svg"
                    alt=""
                    className="h-[20px] w-[20px] invert"
                  />
                  <p className="text-white">Watch</p>
                </Link>
                <div className="h-full">
                  <ImageWithFallback
                    imageUrl={media.backdrop_path}
                    altText={media.title || media.name}
                    quality={"original"}
                  />
                </div>
              </div>
            </div>
            <div className="flex w-full flex-row gap-4 px-2 md:w-auto">
              <div className="flex flex-col gap-4">
                <div className="flex flex-row items-center gap-4">
                  <p className="w-[100px] font-bold text-foreground/50">
                    Genre
                  </p>
                  <div className="flex w-[60vw] flex-row flex-wrap gap-2 text-sm md:w-[300px] xl:w-[600px]">
                    {mediaData.genres.map((genre: any) => (
                      <div className="flex items-center rounded-[4px] bg-foreground/20 px-4 py-1 text-center">
                        {genre.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-row gap-4">
                  <p className="w-[100px] text-wrap font-bold text-foreground/50">
                    Plot
                  </p>
                  <p className="w-[60vw] text-sm md:w-[300px] xl:w-[600px]">
                    {mediaData.overview}
                  </p>
                </div>

                <div className="flex flex-row gap-4">
                  <p className="w-[100px] font-bold text-foreground/50">
                    {media_type === "movie" ? "Director" : "Creator"}
                  </p>
                  <div className="w-[60vw] text-sm md:w-[300px] xl:w-[600px]">
                    {media_type === "movie"
                      ? mediaCredits.directorOrCreator?.name
                      : mediaData.created_by[0]?.name}
                  </div>
                </div>

                <div className="flex flex-row gap-4">
                  <p className="w-[100px] font-bold text-foreground/50">
                    Writers
                  </p>
                  <span className="w-[60vw] md:w-[300px] xl:w-[600px]">
                    <div className="flex flex-row flex-wrap text-sm">
                      {mediaCredits.writers
                        ? mediaCredits.writers
                            .slice(0, 5)
                            .map((writer, index) => (
                              <Link
                                href={`/protected/person/${writer.id}`}
                                key={index}
                              >
                                {writer.name},{" "}
                              </Link>
                            ))
                        : "N/A"}
                    </div>
                  </span>
                </div>

                <div className="flex flex-row gap-4">
                  <p className="w-[100px] font-bold text-foreground/50">
                    Stars
                  </p>
                  <div className="w-[60vw] text-sm md:w-[300px] xl:w-[600px]">
                    {mediaCredits.actors
                      ? mediaCredits.actors.slice(0, 5).map((actor, index) => (
                          <Link
                            href={`/protected/person/${actor.id}`}
                            key={index}
                          >
                            {actor.name},{" "}
                          </Link>
                        ))
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
