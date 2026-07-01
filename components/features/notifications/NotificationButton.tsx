'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationIcon } from '@/components/ui/Icon';
import {
  fetchUserNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
} from '@/lib/db/client-actions';
import NotificationSkeleton from './NotificationSkeleton';

// The per-type notification cards are only needed once the dropdown is opened
// and notifications load — lazy-load them so they don't sit in the shared
// bundle behind the always-mounted navbar button.
const CommentCard = dynamic(() => import('./CommentCard'));
const FollowCard = dynamic(() => import('./FollowCard'));
const LikeCard = dynamic(() => import('./LikeCard'));
const NewEpisodeCard = dynamic(() => import('./NewEpisodeCard'));
const PostCard = dynamic(() => import('./PostCard'));
const ReplyCard = dynamic(() => import('./ReplyCard'));

interface NotificationButtonProps {
  user_id: string;
}

const NotificationButton: FC<NotificationButtonProps> = ({ user_id }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState('');

  // Unread count (shown on the badge)
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Intersection Observer for infinite scroll
  const { ref, inView } = useInView({ threshold: 0.3, rootMargin: '200px' });

  // -------------------------------
  // 1) Fetch initial unread count
  // -------------------------------
  useEffect(() => {
    if (!user_id) return;

    const fetchUnreadCount = async () => {
      // Skip the poll while the tab is backgrounded — no point hitting the DB
      // for a badge nobody's looking at. We refetch on visibility regain below.
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const count = await getUnreadNotificationCount(user_id);
        setUnreadCount(count >= 9 ? 9 : count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    // Poll for new notifications (replaces the dropped Supabase realtime channel).
    const interval = setInterval(fetchUnreadCount, 30_000);
    // Catch up immediately when the tab comes back to the foreground.
    const onVisible = () => {
      if (!document.hidden) fetchUnreadCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user_id]);

  useEffect(() => {
    setPrevPath(pathname);
    setOpen(false);
  }, [pathname]);

  // (Supabase realtime subscription removed — the 30s poll above keeps the
  // unread badge fresh; opening the dropdown does a full refetch.)

  // -------------------------------
  // 3) Load notifications (infinite scroll)
  // -------------------------------
  const loadNotifications = useCallback(async () => {
    if (!user_id || loading) return;
    if (!hasMore && inView) return;

    if (inView && hasMore) {
      setLoading(true);
      try {
        const results = await fetchUserNotifications(user_id, page, 5);
        if (results.length === 0) {
          setHasMore(false);
        } else {
          setNotifications((prev) => [...prev, ...results]);
          setPage((prevPage) => prevPage + 1);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [user_id, inView, hasMore, loading, page]);

  // Call `loadNotifications` whenever `inView` changes
  useEffect(() => {
    loadNotifications();
  }, [inView, loadNotifications]);

  // -------------------------------
  // 4) Fresh load when opening dropdown
  // -------------------------------
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);

    // If user opens the dropdown, always fetch the latest from scratch
    if (isOpen && user_id) {
      // Reset local state
      setNotifications([]);
      setPage(0);
      setHasMore(true);

      try {
        setLoading(true);
        // Get the first batch (page = 0)
        const results = await fetchUserNotifications(user_id, 0, 5);
        if (results.length === 0) {
          setHasMore(false);
        } else {
          setNotifications(results);
          setPage(1);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }

      // Mark all unread as read
      if (unreadCount > 0) {
        try {
          await markNotificationsRead(user_id);
          setUnreadCount(0);
          setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
        } catch (err) {
          console.error('Error marking notifications as read:', err);
        }
      }
    }
  };

  // -------------------------------
  // 5) Render
  // -------------------------------
  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger className="relative rounded-full p-2 text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground">
        <NotificationIcon className="h-5 w-5 flex-shrink-0 fill-current" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-white">
            {unreadCount >= 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="mx-2 max-h-[70vh] w-screen max-w-[95vw] overflow-y-auto rounded-[8px] border-none bg-background p-0 drop-shadow-lg md:mt-4 md:max-h-[50vh] md:w-[600px]"
        align="end"
      >
        <div className="flex h-full w-full flex-col bg-foreground/10 pb-4">
          <h2 className="w-full p-4 text-lg font-medium">Notifications</h2>
          <div className="h-[1px] w-full bg-foreground/20" />

          <div>
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                if (notification.notification_type === 'follow') {
                  return (
                    <FollowCard key={notification.notification_id} notification={notification} />
                  );
                } else if (notification.notification_type === 'like') {
                  return (
                    <LikeCard key={notification.notification_id} notification={notification} />
                  );
                } else if (notification.notification_type === 'comment') {
                  return (
                    <CommentCard key={notification.notification_id} notification={notification} />
                  );
                } else if (notification.notification_type === 'reply') {
                  return (
                    <ReplyCard key={notification.notification_id} notification={notification} />
                  );
                } else if (notification.notification_type === 'new_post') {
                  return (
                    <PostCard key={notification.notification_id} notification={notification} />
                  );
                } else if (notification.notification_type === 'new_episode') {
                  return (
                    <NewEpisodeCard
                      key={notification.notification_id}
                      notification={notification}
                    ></NewEpisodeCard>
                  );
                }
                return null;
              })
            ) : (
              <div className="p-4">No notifications found</div>
            )}

            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, index) => (
                  <NotificationSkeleton key={index} />
                ))}
              </>
            )}
            {/* The ref is used for infinite scroll. If there's more and not loading, it triggers loadNotifications */}
            {!loading && hasMore && <div ref={ref} className="py-2" />}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationButton;
