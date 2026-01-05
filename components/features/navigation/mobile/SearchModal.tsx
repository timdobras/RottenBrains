'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '@/hooks/UserContext';
import { searchUsers } from '@/lib/client/searchUsers';
import { searchMulti } from '@/lib/tmdb';
import { debounce, SearchCache } from '@/lib/utils/debounce';
import NavAdMobile from '../../ads/NavAdMobile';
import MediaSearchCard from '../../search-bar/MediaSearchCard';
import PersonSearchCard from '../../search-bar/PersonSearchCard';
import UserSearchCard from '../../search-bar/UserSearchCard';

const searchCache = new SearchCache<any[]>(5);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export default function SearchModal({ isOpen, onClose }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const router = useRouter();

  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState('');

  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden'; // Prevent scrolling
      document.documentElement.style.position = 'fixed'; // Keep position fixed
      document.documentElement.style.width = '100%'; // Ensure full width
      document.body.style.overflow = 'hidden'; // Prevent scrolling
      document.body.style.position = 'fixed'; // Prevent body scroll
      document.body.style.width = '100%';
    } else {
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, [isOpen]);

  const handleItemSelect = (item: any) => {
    // For example, if 'item' has an 'id' and 'media_type'
    // you can route accordingly:
    switch (item.media_type) {
      case 'user':
        router.push(`/protected/user/${item.id}`);
        break;
      case 'movie':
        router.push(`/protected/watch/movie/${item.id}`);
        break;
      case 'tv':
        router.push(`/protected/watch/tv/${item.id}/1/1`);
        break;
      case 'person':
        router.push(`/protected/person/${item.id}`);
        break;
      default:
        // Fallback
        console.warn('Unknown media_type', item.media_type);
    }
  };

  // Prevent scrolling on background, but allow scrolling inside modal
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      const modalContent = document.getElementById('modal-content');
      if (modalContent && modalContent.contains(e.target as Node)) {
        return; // Allow scrolling inside the modal content
      }
      e.preventDefault(); // Prevent background scrolling
    };

    if (isOpen) {
      document.addEventListener('touchmove', preventScroll, { passive: false });
    }

    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const search = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query || query.trim().length < 2) {
          setSearchResults([]);
          setLoading(false);
          setError(null);
          return;
        }

        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Check cache first
        const cacheKey = `all:${query.toLowerCase()}`;
        const cached = searchCache.get(cacheKey);
        if (cached) {
          setSearchResults(cached);
          setLoading(false);
          setError(null);
          return;
        }

        setLoading(true);
        setError(null);

        try {
          const [resMedia, resUsers] = await Promise.allSettled([
            searchMulti(query),
            searchUsers(query),
          ]);

          let mediaItems: any[] = [];
          let userItems: any[] = [];
          if (resMedia.status === 'fulfilled') {
            mediaItems = resMedia.value.results.slice(0, 20);
          } else {
            console.error('searchMulti failed:', resMedia.reason);
          }
          if (resUsers.status === 'fulfilled') {
            userItems =
              resUsers.value?.slice(0, 5).map((u: any) => ({
                ...u,
                media_type: 'user',
              })) ?? [];
          } else {
            console.error('searchUsers failed:', resUsers.reason);
          }
          const resAll = [...(userItems ?? []), ...(mediaItems ?? [])];

          searchCache.set(cacheKey, resAll);
          setSearchResults(resAll);
          setLoading(false);
          setHighlightedIndex(0);
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Search error:', error);
            setError('Failed to search. Please try again.');
            setLoading(false);
          }
        }
      }, 150),
    []
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
            <div className="flex h-14 w-full flex-shrink-0 flex-row gap-2 border-b border-foreground/10 px-2 py-2">
              <button
                onClick={onClose}
                className="flex aspect-square h-full items-center justify-center rounded-full transition-colors hover:bg-foreground/10"
              >
                <img
                  src="/assets/icons/arrow-back-outline.svg"
                  alt=""
                  className="invert-on-dark aspect-square h-6"
                />
              </button>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  className="h-full w-full rounded-full bg-foreground/10 px-4 pr-10 transition-all focus:bg-foreground/15 focus:outline-none"
                  placeholder="Search movies, TV, people, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-primary"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="h-full w-full overflow-y-auto">
              {loading && searchResults.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-foreground/20 border-t-primary"></div>
                    <p className="text-sm text-foreground/60">Searching...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-red-500">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                <div className="flex h-full w-full items-center justify-center px-4">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-base font-medium text-foreground/80">No results found</p>
                    <p className="text-center text-sm text-foreground/50">
                      Try a different search term
                    </p>
                  </div>
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="flex h-full w-full flex-col items-center justify-center px-4">
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src="/assets/icons/search.svg"
                      alt=""
                      className="invert-on-dark h-12 w-12 opacity-40"
                    />
                    <p className="text-lg font-medium text-foreground/80">Search for anything</p>
                    <p className="text-center text-sm text-foreground/50">
                      Movies, TV Shows, People, or Users
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="sticky top-0 bg-background/95 px-4 py-3 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {searchResults.map((res, i) => {
                    const isSelected = i === highlightedIndex;
                    return (
                      <div
                        key={`${res.media_type}-${res.id}`}
                        ref={(el) => {
                          itemRefs.current[i] = el;
                        }}
                        className={`w-full transition-colors ${isSelected ? 'bg-foreground/20' : ''}`}
                      >
                        {res.media_type === 'user' ? (
                          <UserSearchCard media={res} onClick={() => handleItemSelect(res)} />
                        ) : res.media_type === 'person' ? (
                          <PersonSearchCard media={res} onClick={() => handleItemSelect(res)} />
                        ) : (
                          (res.media_type === 'movie' || res.media_type === 'tv') && (
                            <MediaSearchCard media={res} onClick={() => handleItemSelect(res)} />
                          )
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
