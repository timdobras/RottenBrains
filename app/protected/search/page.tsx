import InfiniteScrollSearch from "@/components/features/search/InfiniteScrollSearch";
import React from "react";

type Params = Promise<{ query: string }>;

const page = async ({ searchParams }: { searchParams: Params }) => {
  const { query } = await searchParams;
  return <InfiniteScrollSearch query={query}></InfiniteScrollSearch>;
};

export default page;
