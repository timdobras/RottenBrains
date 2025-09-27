import { searchUsers } from "@/lib/client/searchUsers";
import { searchMovies, searchMulti, searchPerson, searchTv } from "@/lib/tmdb";
import { debounce } from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import UserSearchCard from "./UserSearchCard";
import PersonSearchCard from "./PersonSearchCard";
import MediaSearchCard from "./MediaSearchCard";
import { usePathname, useRouter } from "next/navigation";

const SearchBar = () => {
  const categories = ["All", "Movies", "TV", "People", "Users"];

  const [openSearchDialog, setOpenSearchDialog] = useState(true);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);

  const [searchCategory, setSearchCategory] = useState("All");

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const router = useRouter();

  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState("");

  useEffect(() => {
    if (prevPath && prevPath !== pathname) {
      console.log("User navigated from", prevPath, "to", pathname);
    }
    setPrevPath(pathname);
    setOpenSearchDialog(false);
    setOpenCategoryDialog(false);
  }, [pathname]);

  const handleCategorySelect = (category: string) => {
    // Update the state to the selected category
    setSearchCategory(category);

    // If you want to close the category dialog automatically:
    setOpenCategoryDialog(false);
  };

  const search = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query) {
          setSearchResults([]);
          setOpenSearchDialog(false);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          if (searchCategory === "All") {
            const [resMedia, resUsers] = await Promise.allSettled([
              searchMulti(query),
              searchUsers(query),
            ]);

            let mediaItems: any[] = [];
            let userItems: any[] = [];
            if (resMedia.status === "fulfilled") {
              mediaItems = resMedia.value.results;
            } else {
              console.error("searchMulti failed:", resMedia.reason);
            }
            if (resUsers.status === "fulfilled") {
              userItems =
                resUsers.value?.map((u: any) => ({
                  ...u,
                  media_type: "user",
                })) ?? [];
            } else {
              console.error("searchUsers failed:", resUsers.reason);
            }
            const resAll = [...(mediaItems ?? []), ...(userItems ?? [])];
            setOpenSearchDialog(true);
            setSearchResults(resAll);
          } else if (searchCategory === "Movies") {
            const resMedia = await searchMovies(query);
            const mediaItems = resMedia.results.map((m: any) => ({
              ...m,
              media_type: "movie",
            }));
            setOpenSearchDialog(true);
            setSearchResults(mediaItems);
          } else if (searchCategory === "TV") {
            const resMedia = await searchTv(query);
            const mediaItems = resMedia.results.map((m: any) => ({
              ...m,
              media_type: "tv",
            }));
            setOpenSearchDialog(true);
            setSearchResults(mediaItems);
          } else if (searchCategory === "People") {
            const resMedia = await searchPerson(query);
            const mediaItems = resMedia.results.map((m: any) => ({
              ...m,
              media_type: "person",
            }));
            setOpenSearchDialog(true);
            setSearchResults(mediaItems);
          } else if (searchCategory === "Users") {
            const resUsers = await searchUsers(query);
            const userItems =
              resUsers?.map((m: any) => ({
                ...m,
                media_type: "user",
              })) ?? [];
            setOpenSearchDialog(true);
            setSearchResults(userItems);
          }
        } catch (error) {
          console.log(error);
          setLoading(false);
        }
      }),
    [searchCategory],
  );

  const handleItemSelect = (item: any) => {
    // For example, if 'item' has an 'id' and 'media_type'
    // you can route accordingly:
    switch (item.media_type) {
      case "user":
        router.push(`/protected/user/${item.id}`);
        break;
      case "movie":
        router.push(`/protected/watch/movie/${item.id}`);
        break;
      case "tv":
        router.push(`/protected/watch/tv/${item.id}/1/1`);
        break;
      case "person":
        router.push(`/protected/person/${item.id}`);
        break;
      default:
        // Fallback
        console.warn("Unknown media_type", item.media_type);
    }
  };

  useEffect(() => {
    // 2. Listen for clicks on the entire document
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setOpenSearchDialog(false);
      }

      if (
        categoryContainerRef.current &&
        !categoryContainerRef.current.contains(event.target as Node)
      ) {
        setOpenCategoryDialog(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fire the debounced search whenever `query` changes
  useEffect(() => {
    search(searchQuery);
    return () => {
      search.cancel();
    };
  }, [searchQuery, searchCategory]);

  // Scroll the selected item into view whenever highlightedIndex changes.
  useEffect(() => {
    const el = itemRefs.current[highlightedIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedIndex, searchResults]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // If no search results, ignore.
    if (searchResults.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) =>
          Math.min(prev + 1, searchResults.length - 1),
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        event.preventDefault();
        const selectedItem = searchResults[highlightedIndex];
        if (selectedItem) {
          handleItemSelect(selectedItem);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex h-full w-full flex-row items-center gap-2">
      <div ref={categoryContainerRef} className="relative h-full">
        <button
          className="relative flex h-full min-w-32 flex-row items-center justify-center gap-2 rounded-full bg-foreground/10 px-8"
          onClick={() => setOpenCategoryDialog(!openCategoryDialog)}
        >
          <p>{searchCategory}</p>
          <img
            src="/assets/icons/chevron-down.svg"
            alt=""
            className="invert-on-dark"
          />
        </button>

        <dialog
          open={openCategoryDialog}
          className="absolute left-0 top-full z-10 m-0 mt-2 w-full overflow-hidden rounded-[16px] bg-background text-foreground drop-shadow-md"
        >
          <div className="flex h-full w-full flex-col gap-2 bg-foreground/20 py-2">
            {categories.map((category) => (
              <button
                key={category}
                className="w-full p-2 hover:bg-foreground/10"
                onClick={() => handleCategorySelect(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </dialog>
      </div>

      <div className="relative h-full w-full" ref={searchContainerRef}>
        <input
          type="text"
          placeholder={`Search for ${searchCategory.toLowerCase()}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-full w-full rounded-full bg-foreground/10 px-4 text-foreground focus:outline focus:outline-1 focus:outline-primary"
        />
        {openSearchDialog && searchResults.length > 0 && (
          <dialog
            open
            className="absolute left-0 top-full m-0 mt-2 h-screen max-h-[500px] w-full overflow-hidden rounded-[16px] bg-background text-foreground drop-shadow-md"
          >
            <div className="h-full w-full overflow-y-auto bg-foreground/20">
              {searchResults.map((res, i) => {
                const isSelected = i === highlightedIndex;
                // Wrap each card in a div and assign a ref to that div.
                return (
                  <div
                    key={res.id}
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    // Optionally add some styles to visually indicate selection.
                    className={isSelected ? "bg-foreground/20" : ""}
                  >
                    {res.media_type === "user" ? (
                      <UserSearchCard
                        media={res}
                        onClick={() => handleItemSelect(res)}
                      />
                    ) : res.media_type === "person" ? (
                      <PersonSearchCard
                        media={res}
                        onClick={() => handleItemSelect(res)}
                      />
                    ) : (
                      (res.media_type === "movie" ||
                        res.media_type === "tv") && (
                        <MediaSearchCard
                          media={res}
                          onClick={() => handleItemSelect(res)}
                        />
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </dialog>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
