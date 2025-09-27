import { addScaleCorrector } from "framer-motion";
import Link from "next/link";
import React, { FC } from "react";
import FollowButton from "./FollowButton";
import ImageWithFallback from "../media/ImageWithFallback";
import { getRelativeTime } from "@/lib/utils";

interface FollowCardProps {
  notification: any;
}

const LikeCard: FC<FollowCardProps> = ({ notification }) => {
  const imageUrl =
    notification.media_data?.images?.backdrops?.[0]?.file_path ||
    notification.media_data.backdrop_path;
  const post_link = `/protected/user/${notification.post.creatorid}?post_id=${notification.post.id}`;
  return (
    <div className="flex w-full flex-row gap-4 p-4">
      <Link
        href={`/protected/user/${notification.triggered_by_user.id}`}
        className="flex-shrink-0"
      >
        <img
          src={notification.triggered_by_user.image_url}
          alt=""
          className="aspect-square h-12 rounded-full"
        />
      </Link>
      <div className="flex flex-col gap-4">
        <p className="text-lg">
          <Link
            href={`/protected/user/${notification.triggered_by_user.id}`}
            className="text-primary"
          >
            {notification.triggered_by_user.username}
          </Link>{" "}
          liked your post:
        </p>
        <Link
          href={post_link}
          className="flex flex-col gap-2 rounded-[16px] bg-foreground/10 p-4 md:flex-row"
        >
          <div className="flex flex-col gap-2">
            <p className="text-lg">
              {notification.media_data.title || notification.media_data.name}
            </p>
            <p className="line-clamp-3 text-sm text-foreground/50">
              "{notification.post.review_user}"
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

export default LikeCard;
