"use client";

import { searchMulti } from "@/lib/tmdb";
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
} from "react";
import SearchCard from "./SearchCard";
import Link from "next/link";
import SearchUserCard from "./SearchUserCard";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { searchUsers } from "@/lib/client/searchUsers";

const SearchMovies = forwardRef<HTMLInputElement, any>(
  ({ media, setMedia, link, user }, ref) => {
    const [query, setQuery] = useState<string>("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [dataUsers, setDataUsers] = useState<any>(null);
    const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
    const router = useRouter();

    const debouncedSearch = useCallback(
      debounce(async (query: string) => {
        if (query.startsWith("@")) {
          setLoadingUsers(true);
          try {
            const userQuery = query.slice(1);
            const result = await searchUsers(userQuery);
            setDataUsers(result);
          } catch (err) {
            console.error("Failed to fetch data", err);
          } finally {
            setLoadingUsers(false);
          }
        } else {
          setLoading(true);
          try {
            const result = await searchMulti(query);
            setData(result);
          } catch (err) {
            console.error("Failed to fetch data", err);
          } finally {
            setLoading(false);
          }
        }
      }, 300),
      [],
    );

    useEffect(() => {
      if (query) {
        debouncedSearch(query);
      } else {
        setData(null);
        setDataUsers(null);
      }
    }, [query, debouncedSearch]);

    const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    };

    const handleSelect = (selected: any) => {
      if (link) {
        if (selected) {
          if (selected.username) {
            // Redirect to user profile
            router.push(`/protected/user/${selected.id}`);
          } else {
            // Redirect to movie page
            router.push(
              `/protected/media/${selected.media_type}/${selected.id}`,
            );
          }
        }
      } else {
        setMedia(selected);
      }
    };

    const renderOptions = useCallback(() => {
      if (loadingUsers && query.startsWith("@")) {
        return <div className="text-sm/6 text-white">Loading users...</div>;
      }
      if (loading) {
        return <div className="text-sm/6 text-white">Loading movies...</div>;
      }
      if (dataUsers) {
        return dataUsers.slice(0, 10).map((user: any) => (
          <ComboboxOption
            key={user.id}
            value={user}
            className="group flex select-none items-center gap-4 rounded-lg px-3 py-1.5 data-[focus]:bg-white/10"
          >
            <div className="text-sm/6 text-white">
              <SearchUserCard user={user} />
            </div>
          </ComboboxOption>
        ));
      }
      return data?.results.slice(0, 10).map((media: any) => (
        <ComboboxOption
          key={media.id}
          value={media}
          className="rounded-[12px] data-[focus]:bg-white/10"
        >
          <div className="text-sm/6 text-white">
            {link ? (
              <Link href={`/protected/media/${media.media_type}/${media.id}`}>
                <SearchCard media={media} />
              </Link>
            ) : (
              <SearchCard media={media} />
            )}
          </div>
        </ComboboxOption>
      ));
    }, [data, dataUsers, loading, loadingUsers, query, link]);

    return (
      <div className="w-full">
        <Combobox value={media} onChange={handleSelect}>
          <div className="relative">
            <ComboboxInput
              ref={ref} // Attach the forwarded ref here
              className={clsx(
                "w-full rounded-full border border-foreground/20 bg-background py-1.5 pl-3 pr-8 text-sm/6 text-foreground",
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
              className="z-50 w-screen gap-2 rounded-xl border border-white/5 bg-background p-2 empty:hidden md:w-[var(--input-width)]"
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
