import { getWatchTime } from "@/lib/supabase/serverQueries";
import { getMediaDetails } from "@/lib/tmdb";
import {
  getHrefFromMedia,
  getImageUrl,
  getRelativeTime,
  transformRuntime,
} from "@/lib/utils";
import Link from "next/link";

const RecommendedCard = async ({ media_id, media_type, user_id }: any) => {
  const media = await getMediaDetails(media_type, media_id);
  const watchTime = await getWatchTime(user_id, "movie", media_id);
  return (
    <div className="mb-4 flex w-full flex-col gap-2 hover:border-accent hover:bg-foreground/20 md:mb-2 md:flex-row md:p-2">
      <Link
        className="relative w-full flex-shrink-0 overflow-hidden md:w-1/2 md:rounded-[4px]"
        href={getHrefFromMedia(media_type, media_id)}
      >
        {watchTime > 0 && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-accent"
            style={{
              width: `${watchTime}%`,
            }}
          ></div>
        )}
        <div className="absolute bottom-0 right-0 m-2 flex flex-row-reverse gap-2">
          <div className="rounded-[4px] bg-black/60 px-2 py-1 text-xs text-white">
            {transformRuntime(media.runtime)}
          </div>
          <div className="rounded-[4px] bg-black/60 px-2 py-1 text-xs text-white">
            {media.vote_average.toFixed(1)} / 10
          </div>
        </div>
        <img
          src={getImageUrl(media)}
          alt=""
          loading="lazy"
          className="aspect-[16/9] bg-foreground/10 md:rounded-[4px]"
        />
      </Link>
      <div className="flex flex-col gap-1 px-4 md:px-0">
        <h3 className="">{media.title || media.name}</h3>
        <p className="text-sm text-foreground/50 md:text-sm">
          {getRelativeTime(media.release_date || media.first_air_date)}
        </p>
        {/* <p className="line-clamp-2 text-foreground/50 md:hidden">
          {episode.overview}
        </p> */}
      </div>
    </div>
  );
};

export default RecommendedCard;
