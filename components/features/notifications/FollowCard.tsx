import { getRelativeTime } from "@/lib/utils";
import { addScaleCorrector } from "framer-motion";
import Link from "next/link";
import React, { FC } from "react";
import FollowButton from "./FollowButton";

interface FollowCardProps {
  notification: any;
}

const FollowCard: FC<FollowCardProps> = ({ notification }) => {
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
          just followed you!
        </p>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <FollowButton
            user_to_follow_id={notification.triggered_by_user.id}
          ></FollowButton>
          <Link
            href={`/protected/user/${notification.triggered_by_user.id}`}
            className="flex items-center justify-center rounded-full bg-foreground/10 px-4 py-1"
          >
            <p>View profile</p>
          </Link>
        </div>
        <p className="text-sm text-foreground/50">
          {getRelativeTime(notification.created_at)}
        </p>
      </div>
    </div>
  );
};

export default FollowCard;
