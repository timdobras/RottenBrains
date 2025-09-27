import AuthButton from "@/components/features/auth/AuthButton";
import React from "react";
import ScrollButtons from "@/components/common/ScrollButtons";
import MobileTopBarHome from "../../../../components/features/navigation/mobile/NavTop";
import NewTabs from "../../../../components/features/profile/NewTabUser";
import { getUserFromDB } from "@/lib/supabase/serverQueries";
import FollowInfo from "@/components/features/profile/FollowInfo";
import FollowButton from "@/components/features/profile/FollowButton";

type Props = {
  children: React.ReactNode;
  params: Promise<{ [userId: string]: string }>;
};

const ProfileLayout = async ({ children, params }: Props) => {
  const { userId } = await params;
  let user = await getUserFromDB(userId);
  if (!user) {
    return <p>Loading...</p>;
  }
  user = user.user;

  const dateString = user.created_at;
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const formattedDate = formatter.format(date);

  return (
    <>
      <MobileTopBarHome />
      <div className="mx-auto mt-12 w-screen max-w-[100vw] md:mt-0 md:max-w-7xl md:p-4">
        <div className="w-full">
          <div className="aspect-[5/1] w-full overflow-hidden md:rounded-[16px]">
            <img
              src={user.backdrop_url}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="flex h-1/2 w-full flex-row gap-4">
            <div className="-mt-[50px] ml-4 md:-mt-[75px]">
              <img
                src={user.image_url}
                alt="Profile"
                className="overlay-hidden aspect-[1/1] w-[100px] min-w-[100px] rounded-full md:w-[150px] md:min-w-[150px]"
              />
            </div>
            <div className="h-full w-full">
              <div className="flex flex-col pt-4">
                <div className="flex w-full flex-row flex-wrap gap-2 md:justify-between">
                  <p className="text-2xl font-semibold">{user.username}</p>
                  <FollowButton user_to_follow_id={user.id}></FollowButton>
                </div>
                <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
                  <p className="lowercase">@{user.username}</p>
                  <FollowInfo user={user}></FollowInfo>
                  <p className="text-sm text-foreground/50">
                    Member since {formattedDate}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="my-4 w-full md:my-8">
            <NewTabs user_id={user.id.toString()}></NewTabs>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </>
  );
};

export default ProfileLayout;
