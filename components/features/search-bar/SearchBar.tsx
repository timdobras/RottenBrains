'use client';

import { Combobox } from '@base-ui/react/combobox';
import { Popover } from '@base-ui/react/popover';
import { ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { forwardRef, useEffect, useMemo, useState } from 'react';
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

  const [openSearchDialog, setOpenSearchDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);

  const [searchCategory, setSearchCategory] = useState('All');

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const router = useRouter();

  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState('');

  useEffect(() => {
    setPrevPath(pathname);
    setOpenSearchDialog(false);
    setOpenCategoryDialog(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleCategorySelect = (category: string) => {
    setSearchCategory(category);
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
    if (!item) return;
    setOpenSearchDialog(false);
    if (onMediaSelect) {
      onMediaSelect(item);
      return;
    }
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
  };

  // Fire the debounced search whenever `query` or category changes
  useEffect(() => {
    search(searchQuery);
    return () => {
      search.cancel();
    };
  }, [searchQuery, searchCategory, search]);

  const renderCard = (res: any) => {
    // Selection (pointer + keyboard) is owned by Combobox.Item, so the cards
    // get a no-op onClick.
    const noop = () => {};
    if (res.media_type === 'user') return <UserSearchCard media={res} onClick={noop} />;
    if (res.media_type === 'person') return <PersonSearchCard media={res} onClick={noop} />;
    if (res.media_type === 'movie' || res.media_type === 'tv')
      return <MediaSearchCard media={res} onClick={noop} />;
    return null;
  };

  return (
    <div className="flex h-full w-full flex-row items-center gap-2">
      {/* Category selector */}
      <Popover.Root open={openCategoryDialog} onOpenChange={setOpenCategoryDialog}>
        <Popover.Trigger className="relative flex h-full min-w-32 flex-row items-center justify-center gap-2 rounded-full bg-foreground/10 px-8 transition-all hover:bg-foreground/20">
          <p className="font-medium">{searchCategory}</p>
          <ChevronDown
            className={`transition-transform ${openCategoryDialog ? 'rotate-180' : ''}`}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="start"
            sideOffset={8}
            className="z-50 w-[var(--anchor-width)]"
          >
            <Popover.Popup className="w-full overflow-hidden rounded-[16px] bg-background text-foreground shadow-lg outline-none transition duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0">
              <div className="flex w-full flex-col bg-foreground/10">
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
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      {/* Search input + results (typeahead) */}
      <Combobox.Root
        items={searchResults}
        filter={null}
        open={openSearchDialog}
        onOpenChange={setOpenSearchDialog}
        inputValue={searchQuery}
        onInputValueChange={(value) => setSearchQuery(value)}
        onValueChange={(item: any) => handleItemSelect(item)}
        itemToStringLabel={(item: any) => item?.title || item?.name || item?.username || ''}
      >
        <div className="relative h-full w-full">
          <Combobox.Input
            ref={ref}
            placeholder={`Search for ${searchCategory.toLowerCase()}...`}
            onFocus={() => searchQuery.length >= 2 && setOpenSearchDialog(true)}
            className="h-full w-full rounded-full bg-foreground/10 px-4 pr-10 text-foreground transition-all focus:bg-foreground/15 focus:outline focus:outline-2 focus:outline-primary"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-primary"></div>
            </div>
          )}
        </div>

        <Combobox.Portal>
          <Combobox.Positioner
            side="bottom"
            align="start"
            sideOffset={8}
            className="z-50 w-[var(--anchor-width)]"
          >
            <Combobox.Popup className="max-h-[500px] w-full overflow-hidden rounded-[16px] bg-background text-foreground shadow-xl outline-none">
              <div className="max-h-[500px] w-full overflow-y-auto bg-foreground/10">
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
                    <Combobox.List>
                      {(res: any) => (
                        <Combobox.Item
                          key={`${res.media_type}-${res.id}`}
                          value={res}
                          className="cursor-pointer transition-colors data-[highlighted]:bg-foreground/20"
                        >
                          {renderCard(res)}
                        </Combobox.Item>
                      )}
                    </Combobox.List>
                  </>
                )}
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
