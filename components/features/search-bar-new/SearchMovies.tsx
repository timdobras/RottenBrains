"use client";

import { searchMovies } from "@/lib/tmdb";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from "@headlessui/react";
import clsx from "clsx";
import {
  useState,
  ChangeEvent,
  useEffect,
  useCallback,
  forwardRef,
  useMemo,
} from "react";
import Link from "next/link";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { searchUsers } from "@/lib/client/searchUsers";
import SearchCard from "./SearchCard";
import SearchUserCard from "./SearchUserCard";

const SearchMovies = forwardRef<HTMLInputElement, any>(
  ({ media, setMedia, link, user }, ref) => {
    const router = useRouter();

    // Local states
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[] | undefined>([]);
    const [loading, setLoading] = useState(false);

    /**
     * Debounced search function to fetch either users or media,
     * depending on whether the query starts with "@".
     */
    const debouncedSearch = useMemo(
      () =>
        debounce(async (q: string) => {
          // Edge case: if query is empty, reset and bail out
          if (!q) {
            setResults([]);
            setLoading(false);
            return;
          }

          setLoading(true);

          try {
            if (q.startsWith("@")) {
              // Searching for users
              const userQuery = q.slice(1);
              const userResults = await searchUsers(userQuery);
              // Convert raw user objects to typed shape
              const typedUserResults: any[] | undefined = userResults?.map(
                (u: any) => ({
                  ...u,
                  type: "user",
                }),
              );
              setResults(typedUserResults);
            } else {
              // Searching for media (movies / tv shows)
              const mediaResults = await searchMovies(q);
              // TMDB responses typically have `results: []`
              // Convert them to typed shape
              const typedMediaResults: any[] = mediaResults.results.map(
                (m: any) => ({
                  ...m,
                  type: "media",
                }),
              );
              setResults(typedMediaResults);
            }
          } catch (err) {
            console.error("Failed to fetch data", err);
          } finally {
            setLoading(false);
          }
        }, 300),
      [],
    );

    // Fire the debounced search whenever `query` changes
    useEffect(() => {
      debouncedSearch(query);
      // Cancel the debounce on unmount
      return () => {
        debouncedSearch.cancel();
      };
    }, [query, debouncedSearch]);

    // Update the local `query` state whenever user types
    const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    };

    // Handle the selection from the Combobox
    const handleSelect = (selected: any | null) => {
      if (!selected) return;

      if (!link) {
        // If we're not using links, just store the selection in local state
        if (selected.type === "media") {
          setMedia?.(selected as any);
        } else {
          // user selected; handle how you want, or ignore
          console.log("Selected user:", selected);
        }
        return;
      }

      // If link is true, navigate to the correct route
      if (selected.type === "user") {
        router.push(`/protected/user/${selected.id}`);
      } else {
        router.push(`/protected/media/${selected.media_type}/${selected.id}`);
      }
    };

    // Render logic for the dropdown results
    const renderOptions = () => {
      if (loading) {
        return <div className="px-2 py-1 text-sm/6 text-white">Loading...</div>;
      }

      // Show "No results found" if query is not empty but no results
      if (!results?.length && query) {
        return (
          <div className="px-2 py-1 text-sm/6 text-white">
            No results found.
          </div>
        );
      }

      // Otherwise, map through the results
      return results?.slice(0, 10).map((item) => {
        if (item.type === "user") {
          return (
            <ComboboxOption
              key={item.id}
              value={item}
              className="bg-foreground/10 data-[focus]:bg-white/20"
            >
              <SearchUserCard user={item} />
            </ComboboxOption>
          );
        }

        // Media (movie / tv)
        return (
          <ComboboxOption
            key={item.id}
            value={item}
            className="bg-foreground/10 data-[focus]:bg-white/20"
          >
            {link ? (
              <Link href={`/protected/media/${item.media_type}/${item.id}`}>
                <SearchCard media={item} />
              </Link>
            ) : (
              <SearchCard media={item} />
            )}
          </ComboboxOption>
        );
      });
    };

    return (
      <div className="h-full w-full">
        <Combobox value={media} onChange={handleSelect}>
          <div className="relative h-full">
            <ComboboxInput
              ref={ref} // Attach the forwarded ref here
              className={clsx(
                "h-full w-full rounded-full bg-foreground/10 px-4 text-sm text-foreground",
                "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-foreground/25",
              )}
              displayValue={(media: any) => media?.title}
              onChange={handleQueryChange}
              placeholder="Search Rotten Brains"
            />
            <ComboboxButton className="group absolute inset-y-0 right-0 px-4">
              <img
                src={"/assets/icons/search.svg"}
                alt={""}
                width={20}
                height={20}
                className="invert-on-dark opacity-70"
              />
            </ComboboxButton>
          </div>
          <Transition
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <ComboboxOptions
              anchor="bottom"
              className="z-30 h-full w-screen rounded-[16px] bg-background empty:hidden md:w-[var(--input-width)]"
            >
              {renderOptions()}
            </ComboboxOptions>
          </Transition>
        </Combobox>
      </div>
    );
  },
);

export default SearchMovies;
