'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/UserContext';
import { getFollowing } from '@/lib/supabase/clientQueries';
import { queryKeys } from '@/lib/queryKeys';

export default function FeedFollowing() {
  const { user } = useUser();
  const userId = user?.id?.toString();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.profile.following(userId ?? ''),
    queryFn: () => getFollowing(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const following = data?.following ?? [];

  return (
    <div className="sticky top-20 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground/70">Following</h3>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-foreground/10" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-20 animate-pulse rounded bg-foreground/10" />
                <div className="h-2.5 w-14 animate-pulse rounded bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      ) : following.length === 0 ? (
        <p className="text-xs text-foreground/40">You aren&apos;t following anyone yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {following.map((item: any) => {
            const u = item.users ?? item;
            return (
              <li key={u.id}>
                <Link
                  href={`/protected/user/${u.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-foreground/5"
                >
                  {u.image_url ? (
                    <img
                      src={u.image_url}
                      alt={u.username}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-foreground/20" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-foreground/50">@{u.username}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
