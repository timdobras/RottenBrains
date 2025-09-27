import React from "react";
import { getMediaDetails } from "@/lib/tmdb";
import { getAverageColor } from "fast-average-color-node";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getWatchListSpecific,
} from "@/lib/supabase/serverQueries";
import WatchListCard from "@/components/features/library/CategoryCard";

const page = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

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
    <div className="mb-16 w-full flex-col px-4 py-4 md:px-0">
      <h1 className="px-4 text-lg font-semibold">Watch List</h1>
      <div className="my-4 w-full border-b-2 border-foreground/5"></div>

      <div className="flex w-full flex-col gap-8 md:flex-row">
        <WatchListCard
          label="Watching"
          color={watchingColor.hex}
          mediaId={watchingMedia.id}
          imageUrl={watchingImageUrl}
        />
        <WatchListCard
          label="Planned"
          color={plannedColor.hex}
          mediaId={plannedMedia.id}
          imageUrl={plannedImageUrl}
        />
        <WatchListCard
          label="Watched"
          color={watchedColor.hex}
          mediaId={watchedMedia.id}
          imageUrl={watchedImageUrl}
        />
      </div>
    </div>
  );
};

export default page;
