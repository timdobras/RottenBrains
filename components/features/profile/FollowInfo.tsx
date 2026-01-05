'use client';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { getFollowers, getFollowing, getPostCount } from '@/lib/supabase/clientQueries';
import { IUser } from '@/types';
import UserSearchCard from '../search-bar/UserSearchCard';
import Modal from './Modal';

const FollowInfo = ({ user }: any) => {
  const router = useRouter();
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { followers, followers_count } = await getFollowers(user.id);
        setFollowers(followers);
        setFollowersCount(followers_count);

        const { following, following_count } = await getFollowing(user.id);
        setFollowing(following);
        setFollowingCount(following_count);

        const { post_count } = await getPostCount(user.id);
        setPostCount(post_count);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [user.id]);

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
          {followers.map((user: any) => (
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
          {following.map((user: any) => (
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
