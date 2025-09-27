import { redirect } from "next/navigation";
import React from "react";
import ProfilePicture from "../../../components/features/profile/ProfilePictureChange";
import NewTabs from "../../../components/features/profile/NewTabs";
import MobileTopBarHome from "../../../components/features/navigation/mobile/NavTop";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import FollowInfo from "@/components/features/profile/FollowInfo";
import FollowButton from "@/components/features/profile/FollowButton";

const ProfileLayout = async ({ children }: { children: React.ReactNode }) => {
  let currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const user = currentUser;
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
      <div className="mt-12 w-full md:mx-auto md:mt-0 md:max-w-7xl md:p-4">
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
              <ProfilePicture />
            </div>
            <div className="h-full w-full">
              <div className="flex flex-col gap-2 pt-4 md:gap-4">
                <div className="flex w-full flex-row flex-wrap gap-4 md:justify-between">
                  <p className="text-2xl font-semibold">{user.username}</p>
                  <FollowButton user_to_follow_id={user.id} />
                </div>
                <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
                  <FollowInfo user={user} />
                  <p className="text-sm text-foreground/50">
                    Member since {formattedDate}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:my-8">
            <NewTabs />
          </div>
          <div className="max-w-screen w-full">{children}</div>
        </div>
      </div>
    </>
  );
};

export default ProfileLayout;
