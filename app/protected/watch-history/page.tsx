import React from "react";
import { redirect } from "next/navigation";
import WatchHistoryWithInfiniteScroll from "@/components/features/watch-history/InfiniteScroll";
import { getCurrentUser } from "@/lib/supabase/serverQueries";

const page = async () => {
  // Fetch the user and watch history
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="my-4 mb-12 w-full px-4 md:px-0">
      <h1 className="px-4 text-lg font-semibold">History</h1>
      <div className="my-4 w-full border-b-2 border-foreground/5"></div>
      <WatchHistoryWithInfiniteScroll></WatchHistoryWithInfiniteScroll>
    </div>
  );
};

export default page;
