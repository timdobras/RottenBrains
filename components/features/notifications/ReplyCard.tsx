import { addScaleCorrector } from "framer-motion";
import Link from "next/link";
import React, { FC } from "react";
import ImageWithFallback from "../media/ImageWithFallback";
import { getRelativeTime } from "@/lib/utils";

interface FollowCardProps {
  notification: any;
}

const ReplyCard: FC<FollowCardProps> = ({ notification }) => {
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
      <Link href={post_link} className="flex flex-col gap-4">
        <p className="text-lg">
          <Link
            href={`/protected/user/${notification.triggered_by_user.id}`}
            className="text-primary"
          >
            {notification.triggered_by_user.username}
          </Link>{" "}
          replied to your comment:
        </p>
        <p className="">{notification.comment.content}</p>
        <div className="rounded-[16px] bg-foreground/10 p-4">
          <p className="line-clamp-3 text-foreground/50">
            "{notification.parent_comment.content}"
          </p>
        </div>
        <p className="text-sm text-foreground/50">
          {getRelativeTime(notification.created_at)}
        </p>
      </Link>
    </div>
  );
};

export default ReplyCard;
