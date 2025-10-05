import React from 'react';
import WatchListInfiniteScroll from '@/components/features/library/InfiniteScroll';
import { getCurrentUser, getWatchListSpecific } from '@/lib/supabase/serverQueries';
type Params = Promise<{ watch_list_type: string }>;
const page = async ({ params }: { params: Params }) => {
  const { watch_list_type } = await params;

  let user = await getCurrentUser();
  user = user;
  const limit = 10;
  const offset = 0;

  const media = await getWatchListSpecific(user.id, limit, offset, watch_list_type);

  return (
    <div className="mb-16 w-full flex-col px-4 py-4">
      <h1 className="px-4 text-lg font-semibold">{watch_list_type}</h1>
      <div className="my-4 w-full border-b-2 border-foreground/5"></div>
      <div className="w-full">
        <WatchListInfiniteScroll
          watchListType={watch_list_type}
          userId={user.id}
        ></WatchListInfiniteScroll>
      </div>
    </div>
  );
};

export default page;
