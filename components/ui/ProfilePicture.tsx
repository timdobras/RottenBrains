import Link from "next/link";
import React, { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const ProfilePicture = ({ user }: any) => {
  return (
    <div>
      {user && (
        <div>
          <Link href={`/protected/user/${user.id}`}>
            <img
              src={user.image_url}
              alt={"prof-pic"}
              width={50}
              height={50}
              className="max-h-[32px] max-w-[32px] overflow-hidden rounded-full"
            ></img>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProfilePicture;
