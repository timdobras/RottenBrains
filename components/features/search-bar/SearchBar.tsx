import { usePathname, useRouter } from 'next/navigation';
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { searchUsers } from '@/lib/client/searchUsers';
import { searchMovies, searchMulti, searchPerson, searchTv } from '@/lib/tmdb';
import { debounce, SearchCache } from '@/lib/utils/debounce';
import MediaSearchCard from './MediaSearchCard';
import PersonSearchCard from './PersonSearchCard';
import UserSearchCard from './UserSearchCard';

const searchCache = new SearchCache<any[]>(5);

interface SearchBarProps {
  onMediaSelect?: (media: any) => void;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>((props, ref) => {
  const { onMediaSelect } = props;
  const categories = ['All', 'Movies', 'TV', 'People', 'Users'];

  const [openSearchDialog, setOpenSearchDialog] = useState(true);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);

  const [searchCategory, setSearchCategory] = useState('All');

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const router = useRouter();

  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState('');

  useEffect(() => {
    if (prevPath && prevPath !== pathname) {
      console.log('User navigated from', prevPath, 'to', pathname);
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
        if (!query || query.trim().length < 2) {
          setSearchResults([]);
          setOpenSearchDialog(false);
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
        const cacheKey = `${searchCategory}:${query.toLowerCase()}`;
        const cached = searchCache.get(cacheKey);
        if (cached) {
          setSearchResults(cached);
          setOpenSearchDialog(true);
          setLoading(false);
          setError(null);
          return;
        }

        setLoading(true);
        setError(null);

        try {
          let results: any[] = [];

          if (searchCategory === 'All') {
            const [resMedia, resUsers] = await Promise.allSettled([
              searchMulti(query),
              searchUsers(query),
            ]);

            let mediaItems: any[] = [];
            let userItems: any[] = [];
            if (resMedia.status === 'fulfilled') {
              mediaItems = resMedia.value.results.slice(0, 15);
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
            results = [...(userItems ?? []), ...(mediaItems ?? [])];
          } else if (searchCategory === 'Movies') {
            const resMedia = await searchMovies(query);
            results = resMedia.results.slice(0, 20).map((m: any) => ({
              ...m,
              media_type: 'movie',
            }));
          } else if (searchCategory === 'TV') {
            const resMedia = await searchTv(query);
            results = resMedia.results.slice(0, 20).map((m: any) => ({
              ...m,
              media_type: 'tv',
            }));
          } else if (searchCategory === 'People') {
            const resMedia = await searchPerson(query);
            results = resMedia.results.slice(0, 20).map((m: any) => ({
              ...m,
              media_type: 'person',
            }));
          } else if (searchCategory === 'Users') {
            const resUsers = await searchUsers(query);
            results =
              resUsers?.map((m: any) => ({
                ...m,
                media_type: 'user',
              })) ?? [];
          }

          searchCache.set(cacheKey, results);
          setSearchResults(results);
          setOpenSearchDialog(true);
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
    [searchCategory]
  );

  const handleItemSelect = (item: any) => {
    setOpenSearchDialog(false); // Close the dialog on selection
    if (onMediaSelect) {
      onMediaSelect(item);
    } else {
      // Default navigation behavior if no callback is provided
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
          console.warn('Unknown media_type', item.media_type);
      }
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedIndex, searchResults]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // If no search results, ignore.
    if (searchResults.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
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
          className="relative flex h-full min-w-32 flex-row items-center justify-center gap-2 rounded-full bg-foreground/10 px-8 transition-all hover:bg-foreground/20"
          onClick={() => setOpenCategoryDialog(!openCategoryDialog)}
        >
          <p className="font-medium">{searchCategory}</p>
          <img
            src="/assets/icons/chevron-down.svg"
            alt=""
            className={`invert-on-dark transition-transform ${openCategoryDialog ? 'rotate-180' : ''}`}
          />
        </button>

        <dialog
          open={openCategoryDialog}
          className="absolute left-0 top-full z-10 m-0 mt-2 w-full overflow-hidden rounded-[16px] bg-background text-foreground shadow-lg"
        >
          <div className="flex h-full w-full flex-col bg-foreground/10">
            {categories.map((category) => (
              <button
                key={category}
                className={`w-full p-3 text-left transition-colors hover:bg-foreground/20 ${
                  category === searchCategory ? 'bg-primary/20 font-medium text-primary' : ''
                }`}
                onClick={() => handleCategorySelect(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </dialog>
      </div>

      <div className="relative h-full w-full" ref={searchContainerRef}>
        <div className="relative h-full w-full">
          <input
            ref={ref}
            type="text"
            placeholder={`Search for ${searchCategory.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.length >= 2 && setOpenSearchDialog(true)}
            className="h-full w-full rounded-full bg-foreground/10 px-4 pr-10 text-foreground transition-all focus:bg-foreground/15 focus:outline focus:outline-2 focus:outline-primary"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-primary"></div>
            </div>
          )}
        </div>

        {openSearchDialog && (
          <dialog
            open
            className="absolute left-0 top-full m-0 mt-2 h-screen max-h-[500px] w-full overflow-hidden rounded-[16px] bg-background text-foreground shadow-xl"
          >
            <div className="h-full w-full overflow-y-auto bg-foreground/10">
              {loading && searchResults.length === 0 ? (
                <div className="flex h-32 w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-primary"></div>
                    <p className="text-sm text-foreground/60">Searching...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex h-32 w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-red-500">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                <div className="flex h-32 w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-sm font-medium text-foreground/80">No results found</p>
                    <p className="text-xs text-foreground/50">Try a different search term</p>
                  </div>
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="flex h-32 w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-sm text-foreground/60">
                      Type at least 2 characters to search
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="sticky top-0 bg-background/80 px-4 py-2 backdrop-blur-sm">
                    <p className="text-xs font-medium text-foreground/60">
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
                        className={`transition-colors ${isSelected ? 'bg-foreground/20' : 'hover:bg-foreground/10'}`}
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
          </dialog>
        )}
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;