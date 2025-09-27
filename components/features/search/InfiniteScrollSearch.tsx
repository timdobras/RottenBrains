"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { searchMulti } from "@/lib/tmdb";
import { useUser } from "@/hooks/UserContext";
import MediaCardClient from "../media/MediaCardClient";

interface SearchResult {
  id: number;
  media_type: string;
  // ...any other props you care about (title, name, etc.)
}

interface SearchResponse {
  page: number;
  total_pages: number;
  results: SearchResult[];
  // ...any other TMDB search response fields
}

const InfiniteScrollSearch = ({ query }: { query: string }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // We'll keep two separate arrays for clarity:
  // 1. People
  // 2. Movies/TV
  const [peopleItems, setPeopleItems] = useState<SearchResult[]>([]);
  const [mediaItems, setMediaItems] = useState<SearchResult[]>([]);

  const [page, setPage] = useState<number>(1);
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: "200px" });
  const targetRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();
  const user_id = user?.id;

  const loadMore = useCallback(async () => {
    if (!inView || !hasMore || loading) return;

    setLoading(true);
    try {
      // Fetch search results from TMDB for the current page
      const data: SearchResponse = await searchMulti(query, page);

      // Separate out people vs. movies/TV
      const newPeople = data.results.filter(
        (item) => item.media_type === "person",
      );
      const newMedia = data.results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv",
      );

      setPeopleItems((prev) => [...prev, ...newPeople]);
      setMediaItems((prev) => [...prev, ...newMedia]);

      // If we've reached the total pages from TMDB, stop loading more
      if (data.page >= data.total_pages) {
        setHasMore(false);
      } else {
        setPage((prevPage) => prevPage + 1);
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  }, [inView, hasMore, loading, page, query]);

  // Kick off first load on mount or when query changes
  useEffect(() => {
    // If the query changes, reset everything
    setPage(1);
    setHasMore(true);
    setPeopleItems([]);
    setMediaItems([]);
  }, [query]);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  return (
    <div
      className="flex w-full flex-col justify-center gap-4 p-4 md:px-4"
      ref={targetRef}
    >
      <div className="mb-8">
        {mediaItems.length > 0 ? (
          <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
            {mediaItems.map((mediaItem) => (
              <MediaCardClient
                key={`${mediaItem.media_type}-${mediaItem.id}`}
                media_type={mediaItem.media_type}
                media_id={mediaItem.id}
                user_id={user_id?.toString() ?? ""}
                rounded={true}
              />
            ))}
          </div>
        ) : (
          <p>No movies/TV found yet.</p>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && !user && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-4">
              <div className="aspect-[16/9] w-full bg-foreground/10"></div>
              <div className="h-6 w-2/3 bg-foreground/10"></div>
              <div className="h-6 w-1/3 bg-foreground/10"></div>
            </div>
          ))}
        </div>
      )}

      {/* Intersection Observer Trigger */}
      {!loading && hasMore && <div ref={ref} />}
    </div>
  );
};

export default InfiniteScrollSearch;
