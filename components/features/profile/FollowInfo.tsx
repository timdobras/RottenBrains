'use client';
import { useRouter } from 'next/navigation';
import React, { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getFollowers, getFollowing, getPostCount } from '@/lib/supabase/clientQueries';
import { queryKeys } from '@/lib/queryKeys';
import { IUser } from '@/types';
import UserSearchCard from '../search-bar/UserSearchCard';
import Modal from './Modal';

interface FollowInfoProps {
  user: IUser;
}

const FollowInfo = ({ user }: FollowInfoProps) => {
  const router = useRouter();
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);

  // Convert user.id to string for API calls (IUser.id is number, APIs expect string)
  const userId = useMemo(() => String(user.id), [user.id]);

  // Parallel data fetching with React Query - eliminates waterfall
  const [followersQuery, followingQuery, postCountQuery] = useQueries({
    queries: [
      {
        queryKey: queryKeys.profile.followers(userId),
        queryFn: () => getFollowers(userId),
        staleTime: 1000 * 60, // 1 minute
      },
      {
        queryKey: queryKeys.profile.following(userId),
        queryFn: () => getFollowing(userId),
        staleTime: 1000 * 60,
      },
      {
        queryKey: queryKeys.profile.postCount(userId),
        queryFn: () => getPostCount(userId),
        staleTime: 1000 * 60,
      },
    ],
  });

  const followers = followersQuery.data?.followers ?? [];
  const followersCount = followersQuery.data?.followers_count ?? 0;
  const following = followingQuery.data?.following ?? [];
  const followingCount = followingQuery.data?.following_count ?? 0;
  const postCount = postCountQuery.data?.post_count ?? 0;

  return (
    <div className="text-sm text-foreground/50">
      <div className="flex flex-row items-center gap-2">
        <div className="flex flex-row items-center gap-1">
          <p className="">{postCount}</p>
          <p>posts</p>
        </div>
        <div className="h-1 w-1 rounded-full bg-foreground/50"></div>
        <div
          className="flex cursor-pointer flex-row items-center justify-center gap-1"
          onClick={() => setIsFollowersModalOpen(true)}
        >
          <p className="">{followersCount}</p>
          <p>followers</p>
        </div>
        <div className="h-1 w-1 rounded-full bg-foreground/50"></div>
        <div
          className="flex cursor-pointer flex-row items-center justify-center gap-1"
          onClick={() => setIsFollowingModalOpen(true)}
        >
          <p className="">{followingCount}</p>
          <p>following</p>
        </div>
      </div>

      <Modal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        title="Followers"
      >
        <ul className="flex flex-col gap-2">
          {followers.map((user: { id: string }) => (
            <li key={user.id}>
              <UserSearchCard
                media={user}
                onClick={() => router.push(`/protected/user/${user.id}`)}
              />
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        isOpen={isFollowingModalOpen}
        onClose={() => setIsFollowingModalOpen(false)}
        title="Following"
      >
        <ul className="flex flex-col gap-2">
          {following.map((user: { id: string }) => (
            <li key={user.id}>
              <UserSearchCard
                media={user}
                onClick={() => router.push(`/protected/user/${user.id}`)}
              />
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
};

export default FollowInfo;
