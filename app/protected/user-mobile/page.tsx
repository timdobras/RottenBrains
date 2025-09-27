import NavTop from "@/components/features/navigation/mobile/NavTop";
import React from "react";
import Profile from "./Profile";
import {
  getWatchHistoryForUser,
  getWatchListSpecific,
} from "@/lib/supabase/clientQueries";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import MediaCardUI from "@/components/features/media/MediaCardUI";
import MediaCardClient from "@/components/features/media/MediaCardClient";
import MediaCardServer from "@/components/features/media/MediaCardServer";
import { redirect } from "next/navigation";
import { getMediaDetails } from "@/lib/tmdb";
import { getAverageColor } from "fast-average-color-node";
import WatchListCard from "@/components/features/library/CategoryCard";
import Link from "next/link";

const page = async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const history = await getWatchHistoryForUser(user.id.toString(), 10, 0);

  const limit = 1;
  const offset = 0;

  // Example queries
  const watching = await getWatchListSpecific(
    user.id,
    limit,
    offset,
    "watching",
  );
  const planned = await getWatchListSpecific(user.id, limit, offset, "planned");
  const watched = await getWatchListSpecific(user.id, limit, offset, "watched");

  // “Watched”
  const fwatched = watched[0];
  const watchedMedia = await getMediaDetails(
    fwatched.media_type,
    fwatched.media_id,
  );
  const watchedImageUrl =
    watchedMedia?.images?.backdrops?.[0]?.file_path ||
    watchedMedia?.backdrop_path;
  const watchedColor = await getAverageColor(
    `https://image.tmdb.org/t/p/w200${watchedMedia.backdrop_path}`,
  );

  // “Watching”
  const fwatching = watching[0];
  const watchingMedia = await getMediaDetails(
    fwatching.media_type,
    fwatching.media_id,
  );
  const watchingImageUrl =
    watchingMedia?.images?.backdrops?.[0]?.file_path ||
    watchingMedia?.backdrop_path;
  const watchingColor = await getAverageColor(
    `https://image.tmdb.org/t/p/w200${watchingMedia.backdrop_path}`,
  );

  // “Planned”
  const fplanned = planned[0];
  const plannedMedia = await getMediaDetails(
    fplanned.media_type,
    fplanned.media_id,
  );
  const plannedImageUrl =
    plannedMedia?.images?.backdrops?.[0]?.file_path ||
    plannedMedia?.backdrop_path;
  const plannedColor = await getAverageColor(
    `https://image.tmdb.org/t/p/w200${plannedMedia.backdrop_path}`,
  );
  return (
    <>
      <NavTop />
      <section className="mt-12 w-full">
        <Profile />
      </section>
      <div className="mt-4 flex flex-row items-center justify-between px-4">
        <span className="text-lg font-bold">History</span>
        <Link
          href="/protected/watch-history"
          className="text-xs text-foreground/70"
        >
          View all
        </Link>
      </div>
      <section className="mt-2 flex w-full flex-row gap-4 overflow-x-auto px-4">
        {history.map((media: any) => {
          // Convert -1 to null, if that’s how your DB denotes "no episode or season"
          const season_number =
            media.season_number === -1 ? null : media.season_number;
          const episode_number =
            media.episode_number === -1 ? null : media.episode_number;

          return (
            <div className="">
              <MediaCardServer
                key={media.id /* or media.media_id if needed */}
                user_id={user.id.toString()}
                media_type={media.media_type}
                media_id={
                  media.media_id /* or media.media_id if that's TMDB ID */
                }
                season_number={season_number}
                episode_number={episode_number}
                rounded
              />
            </div>
          );
        })}
      </section>
      <div className="mt-4 flex flex-row items-center justify-between px-4">
        <span className="text-lg font-bold">Library</span>
        <Link
          href="/protected/watch-list"
          className="text-xs text-foreground/70"
        >
          View all
        </Link>
      </div>
      <section className="mt-2 flex w-full flex-row gap-4 overflow-x-auto px-4 pb-4">
        <div className="w-[200px] flex-shrink-0">
          <WatchListCard
            label="Watching"
            color={watchingColor.hex}
            mediaId={watchingMedia.id}
            imageUrl={watchingImageUrl}
          />
        </div>
        <div className="w-[200px] flex-shrink-0">
          <WatchListCard
            label="Planned"
            color={plannedColor.hex}
            mediaId={plannedMedia.id}
            imageUrl={plannedImageUrl}
          />
        </div>
        <div className="w-[200px] flex-shrink-0">
          <WatchListCard
            label="Watched"
            color={watchedColor.hex}
            mediaId={watchedMedia.id}
            imageUrl={watchedImageUrl}
          />
        </div>
      </section>
      <section className="mt-8 flex w-full flex-col">
        <Link
          href="/protected/profile"
          className="w-full border-y border-foreground/20 p-4 px-8 text-lg"
        >
          Profile
        </Link>
        <Link
          href="/protected/settings"
          className="w-full border-y border-foreground/20 p-4 px-8 text-lg"
        >
          Settings
        </Link>
      </section>
    </>
  );
};

export default page;
