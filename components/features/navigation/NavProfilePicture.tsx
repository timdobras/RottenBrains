"use client";
import { useUser } from "@/hooks/UserContext";
import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import ThemeSwitch from "./NavThemeSwitch";
import { useToast } from "../../ui/use-toast";
import { signOut } from "@/lib/supabase/clientQueries";
import { usePathname, useRouter } from "next/navigation";

interface ProfilePictureNewProps {
  /**
   * Optional Tailwind class to control the image size.
   * Default is "h-8 w-8".
   * For example, you could pass "h-10 w-10" or "h-12 w-12".
   */
  imageSize?: string;
}

const ProfilePictureNew: React.FC<ProfilePictureNewProps> = ({
  imageSize = "h-8",
}) => {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState("");

  useEffect(() => {
    if (prevPath && prevPath !== pathname) {
      console.log("User navigated from", prevPath, "to", pathname);
    }
    setPrevPath(pathname);
    setOpen(false);
  }, [pathname]);

  if (!user) {
    return <div className={`aspect-square ${imageSize}`}></div>;
  }

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
    toast({
      title: "Successfully signed out",
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={() => setOpen(!open)}>
      <DropdownMenuTrigger>
        <img
          src={user.image_url}
          alt="User Avatar"
          className={`aspect-square rounded-full ${imageSize}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-[300px] rounded-[8px] border-none bg-background p-0 drop-shadow-lg"
        align="end"
      >
        <div className="flex h-full w-full flex-col gap-2 bg-foreground/10 pb-4">
          <Link
            href={"/protected/profile"}
            className="flex w-full flex-row gap-2 p-4"
          >
            <img
              src={user.image_url}
              alt="User Avatar"
              className={`aspect-square h-12 rounded-full`}
            />
            <div className="flex flex-col">
              <p className="truncate text-lg font-normal">{user.name}</p>
              <p className="truncate font-normal lowercase">@{user.username}</p>
              <p className="mt-2 truncate text-sm font-normal text-primary">
                View your profile
              </p>
            </div>
          </Link>
          <div className="h-[1px] w-full bg-foreground/20"></div>
          <Link
            href="/protected/profile"
            className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
          >
            <img
              src="/assets/icons/person-outline.svg"
              alt="Profile Icon"
              className="invert-on-dark"
            />
            <p>Profile</p>
          </Link>
          <button
            className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
            onClick={handleSignOut}
          >
            <img
              src="/assets/icons/logout.svg"
              alt="Settings Icon"
              className="invert-on-dark"
            />
            <p>Sign out</p>
          </button>
          <div className="h-[1px] w-full bg-foreground/20"></div>
          <Link
            href="/premium"
            className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
          >
            <img
              src="/assets/icons/premium-outline.svg"
              alt="Profile Icon"
              className="invert-on-dark"
            />
            <p>Premium</p>
          </Link>
          <Link
            href="/donations"
            className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
          >
            <img
              src="/assets/icons/donation-outline.svg"
              alt="Profile Icon"
              className="invert-on-dark"
            />
            <p>Donations</p>
          </Link>
          <div className="h-[1px] w-full bg-foreground/20"></div>
          <ThemeSwitch />
          <div className="h-[1px] w-full bg-foreground/20"></div>
          <Link
            href="/protected/settings"
            className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
          >
            <img
              src="/assets/icons/settings-outline.svg"
              alt="Profile Icon"
              className="invert-on-dark"
            />
            <p>Settings</p>
          </Link>
          <div className="h-[1px] w-full bg-foreground/20"></div>
          <Link
            href="/help"
            className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
          >
            <img
              src="/assets/icons/help-outline.svg"
              alt="Profile Icon"
              className="invert-on-dark"
            />
            <p>Help</p>
          </Link>
          <Link
            href="/feedback"
            className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
          >
            <img
              src="/assets/icons/feedback-outline.svg"
              alt="Profile Icon"
              className="invert-on-dark"
            />
            <p>Send feedback</p>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfilePictureNew;
