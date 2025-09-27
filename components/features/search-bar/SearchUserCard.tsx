import Link from "next/link";
import React from "react";

const SearchUserCard = ({ user }: any) => {
  return (
    <Link href={`/protected/user/${user.id}`}>
      <div className="flex h-[100px] flex-row items-center gap-4 p-4 text-foreground">
        <div>
          <img
            src={user.image_url}
            alt={""}
            width={50}
            height={50}
            className="overflow-hidden rounded-full"
          ></img>
        </div>
        <p className="text-lg font-bold">{user.username}</p>
      </div>
    </Link>
  );
};

export default SearchUserCard;
