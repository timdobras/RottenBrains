import { ExploreTabProps } from "@/types";
import React from "react";
import ExploreCard from "@/components/features/explore/ExploreCard";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import { fetchExploreData } from "@/lib/client/fetchExploreData";
import MediaCardServer from "../media/MediaCardServer";

export async function ExploreTab({
  action,
  containerId,
}: ExploreTabProps & { containerId: string }) {
  let user = await getCurrentUser();
  if (user) {
    user = user;
  }
  let exploreData;
  try {
    exploreData = await fetchExploreData(action);
  } catch (error) {
    console.error("Error fetching explore data:", error);
    exploreData = null;
  }

  return (
    <div className="flex w-full flex-col gap-8 border-foreground/20 md:gap-8 md:rounded-[16px] md:border md:p-8">
      <div className="flex w-full flex-row items-center justify-between px-2 md:px-0">
        <h2 className="text-xl font-bold uppercase">{action}</h2>
        <div className="rounded-full bg-foreground/10 px-6 py-2">View all</div>
      </div>

      <div className="hidden-scrollbar flex w-full snap-x snap-mandatory grid-cols-[repeat(auto-fit,minmax(300px,1fr))] flex-row gap-4 overflow-x-auto px-4 md:grid md:px-0">
        {exploreData &&
          exploreData.results.slice(0, 12).map((media: any) => {
            if (!media.media_type && media.title) {
              media.media_type = "movie";
            } else if (!media.media_type && media.name) {
              media.media_type = "tv";
            }
            return (
              <div key={media.id} className="snap-start scroll-ml-4">
                <MediaCardServer
                  media_id={media.id}
                  media_type={media.media_type}
                  user_id={user?.id}
                  rounded
                ></MediaCardServer>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default ExploreTab;
