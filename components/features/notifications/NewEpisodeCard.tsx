import React, { FC } from "react";
import ImageWithFallback from "../media/ImageWithFallback";
import Link from "next/link";
import { formatEpisodeCode, getRelativeTime } from "@/lib/utils";

interface NewEpisodeCardProps {
  notification: any;
}

const NewEpisodeCard: FC<NewEpisodeCardProps> = ({ notification }) => {
  console.log(notification);
  const imageUrl =
    notification.episode_data.still_path ||
    notification.media_data?.images?.backdrops?.[0]?.file_path ||
    notification.media_data.backdrop_path;
  return (
    <div className="flex w-full flex-row gap-4 p-4">
      <div className="flex w-full flex-col gap-4">
        <p className="text-lg">
          There is a new episode from:{" "}
          <Link
            className="text-primary"
            href={`/protected/media/${notification.media_type}/${notification.media_id}`}
          >
            {notification.media_data.name}
          </Link>
        </p>
        <Link
          href={`/protected/watch/${notification.media_type}/${notification.media_id}/${notification.season_number}/${notification.episode_number}`}
          className="flex w-full flex-col justify-between gap-2 rounded-[16px] bg-foreground/10 p-4 md:flex-row"
        >
          <div className="flex flex-col gap-2">
            <p className="text-lg">
              {notification.episode_data.name} |{" "}
              {formatEpisodeCode(
                notification.season_number,
                notification.episode_number,
              )}{" "}
            </p>
            <p className="line-clamp-3 text-sm text-foreground/50">
              {notification.episode_data.overview}
            </p>
          </div>
          <div className="aspect-[16/9] flex-shrink-0 overflow-hidden rounded-[8px] md:max-w-[200px]">
            <ImageWithFallback
              imageUrl={imageUrl}
              altText={notification.notification_id}
            ></ImageWithFallback>
          </div>
        </Link>
        <p className="text-sm text-foreground/50">
          {getRelativeTime(notification.created_at)}
        </p>
      </div>
    </div>
  );
};

export default NewEpisodeCard;
