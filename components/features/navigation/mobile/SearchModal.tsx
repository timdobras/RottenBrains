"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { searchMulti } from "@/lib/tmdb";
import { searchUsers } from "@/lib/client/searchUsers";
import { debounce } from "lodash";
import UserSearchCard from "../../search-bar-new-new/UserSearchCard";
import PersonSearchCard from "../../search-bar-new-new/PersonSearchCard";
import MediaSearchCard from "../../search-bar-new-new/MediaSearchCard";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/hooks/UserContext";
import NavAdMobile from "../../ads/NavAdMobile";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export default function SearchModal({ isOpen, onClose }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const router = useRouter();

  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState("");

  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = "hidden"; // Prevent scrolling
      document.documentElement.style.position = "fixed"; // Keep position fixed
      document.documentElement.style.width = "100%"; // Ensure full width
      document.body.style.overflow = "hidden"; // Prevent scrolling
      document.body.style.position = "fixed"; // Prevent body scroll
      document.body.style.width = "100%";
    } else {
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
    };
  }, [isOpen]);

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

  // Prevent scrolling on background, but allow scrolling inside modal
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      const modalContent = document.getElementById("modal-content");
      if (modalContent && modalContent.contains(e.target as Node)) {
        return; // Allow scrolling inside the modal content
      }
      e.preventDefault(); // Prevent background scrolling
    };

    if (isOpen) {
      document.addEventListener("touchmove", preventScroll, { passive: false });
    }

    return () => {
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const search = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query || query === "") {
          setSearchResults([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
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
          setSearchResults(resAll);
          setLoading(false);
        } catch (error) {
          console.log(error);
          setLoading(false);
        }
      }),
    [],
  );

  // Fire the debounced search whenever `query` changes
  useEffect(() => {
    search(searchQuery);
    return () => {
      search.cancel();
    };
  }, [searchQuery]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Modal Container */}
          <motion.div
            id="modal-content"
            className="fixed relative left-0 top-0 flex h-[100dvh] w-screen flex-col bg-background"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-full flex-shrink-0 flex-row gap-1 py-1">
              <button
                onClick={onClose}
                className="flex aspect-square h-full items-center justify-center"
              >
                <img
                  src="/assets/icons/arrow-back-outline.svg"
                  alt=""
                  className="invert-on-dark aspect-square h-6"
                />
              </button>
              <input
                type="text"
                className="mr-2 h-full w-full rounded-full bg-foreground/10 px-4 focus:outline-none"
                placeholder={`Search...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="h-full w-full overflow-y-auto">
              {searchResults.length > 0 ? (
                <>
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
                        className={`${isSelected ? "bg-foreground/20" : ""} w-full`}
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
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <p className="text-lg font-medium">Search for anything</p>
                  <p className="text-xs text-foreground/50">
                    Movies, TV, People, Users
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
