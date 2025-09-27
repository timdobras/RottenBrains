"use client";

import React, { FC, useCallback, useEffect, useState } from "react";
import { NotificationIcon } from "@/components/ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchUserNotifications } from "@/lib/supabase/clientQueries";
import FollowCard from "./FollowCard";
import LikeCard from "./LikeCard";
import CommentCard from "./CommentCard";
import ReplyCard from "./ReplyCard";
import PostCard from "./PostCard";
import { useInView } from "react-intersection-observer";
import NotificationSkeleton from "./NotificationSkeleton";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import NewEpisodeCard from "./NewEpisodeCard";

const supabase = createClient();

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
  const [prevPath, setPrevPath] = useState("");

  // Unread count (shown on the badge)
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Intersection Observer for infinite scroll
  const { ref, inView } = useInView({ threshold: 0.3, rootMargin: "200px" });

  // -------------------------------
  // 1) Fetch initial unread count
  // -------------------------------
  useEffect(() => {
    if (!user_id) return;

    const fetchUnreadCount = async () => {
      const { data, count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("recipient_id", user_id)
        .eq("read", false);

      if (error) {
        console.error("Error fetching unread count:", error);
        return;
      }

      const _count = count ?? data?.length ?? 0;
      setUnreadCount(_count >= 9 ? 9 : _count);
    };

    fetchUnreadCount();
  }, [user_id]);

  useEffect(() => {
    if (prevPath && prevPath !== pathname) {
      console.log("User navigated from", prevPath, "to", pathname);
    }
    setPrevPath(pathname);
    setOpen(false);
  }, [pathname]);

  // -------------------------------
  // 2) Realtime subscription
  // -------------------------------
  useEffect(() => {
    // If we don't have a user or we already have 9+ unread, do NOT subscribe
    if (!user_id || unreadCount >= 9) return;

    const channel = supabase
      .channel(`user-notifications-${user_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user_id}`,
        },
        (payload) => {
          // =============== INSERT EVENT ===============
          if (payload.eventType === "INSERT") {
            const newNotification = payload.new;
            if (!newNotification.read) {
              // Increase unread count if we're below 9
              setUnreadCount((prev) => {
                const newCount = prev + 1;
                if (newCount >= 9) {
                  supabase.removeChannel(channel);
                  return 9;
                }
                return newCount;
              });
            }

            // If the dropdown is open, prepend the new notification to the list
            if (open) {
              setNotifications((prev) => [newNotification, ...prev]);
            }
          }

          // =============== UPDATE EVENT ===============
          else if (payload.eventType === "UPDATE") {
            // If a notification was read
            if (payload.old.read === false && payload.new.read === true) {
              setUnreadCount((prev) => Math.max(prev - 1, 0));

              // Also update that notification in local state if we have it
              const updatedNotification = payload.new;
              setNotifications((prev) =>
                prev.map((notif) =>
                  notif.notification_id === updatedNotification.notification_id
                    ? updatedNotification
                    : notif,
                ),
              );
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user_id, unreadCount, open]);

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
        console.error("Error fetching notifications:", error);
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
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }

      // Mark all unread as read (optional)
      if (unreadCount > 0) {
        try {
          const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("recipient_id", user_id)
            .eq("read", false);

          if (error) {
            console.error("Error marking notifications as read:", error);
          } else {
            setUnreadCount(0);
            setNotifications((prev) =>
              prev.map((notif) => ({ ...notif, read: true })),
            );
          }
        } catch (err) {
          console.error("Error marking notifications as read:", err);
        }
      }
    }
  };

  // -------------------------------
  // 5) Render
  // -------------------------------
  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger className="relative h-auto">
        <NotificationIcon
          className="m-0 flex-shrink-0 fill-current p-0"
          width={24}
          height={24}
        />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
            {unreadCount >= 9 ? "9+" : unreadCount}
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
                if (notification.notification_type === "follow") {
                  return (
                    <FollowCard
                      key={notification.notification_id}
                      notification={notification}
                    />
                  );
                } else if (notification.notification_type === "like") {
                  return (
                    <LikeCard
                      key={notification.notification_id}
                      notification={notification}
                    />
                  );
                } else if (notification.notification_type === "comment") {
                  return (
                    <CommentCard
                      key={notification.notification_id}
                      notification={notification}
                    />
                  );
                } else if (notification.notification_type === "reply") {
                  return (
                    <ReplyCard
                      key={notification.notification_id}
                      notification={notification}
                    />
                  );
                } else if (notification.notification_type === "new_post") {
                  return (
                    <PostCard
                      key={notification.notification_id}
                      notification={notification}
                    />
                  );
                } else if (notification.notification_type === "new_episode") {
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
