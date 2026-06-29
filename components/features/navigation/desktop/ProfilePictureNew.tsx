'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/hooks/UserContext';
import { signOut } from '@/lib/auth-client';
import { User, History, Settings, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

interface ProfilePictureNewProps {
  imageSize?: string;
}

const ProfilePictureNew: React.FC<ProfilePictureNewProps> = ({ imageSize = 'h-8' }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!user) {
    return <div className={`aspect-square ${imageSize}`}></div>;
  }

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
    toast({
      title: 'Successfully signed out',
    });
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  // Only resolve theme-dependent values after mount to avoid hydration mismatch
  const ThemeIcon = !mounted
    ? Monitor
    : theme === 'light'
      ? Sun
      : theme === 'dark'
        ? Moon
        : Monitor;
  const themeLabel = !mounted
    ? 'System'
    : theme === 'light'
      ? 'Light'
      : theme === 'dark'
        ? 'Dark'
        : 'System';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex h-10 flex-shrink-0 items-center gap-3 rounded-full bg-foreground/5 py-1 pl-5 pr-1 outline-none transition-colors hover:bg-foreground/10"
        >
          <p suppressHydrationWarning className="text-sm font-medium leading-snug tracking-tight">
            {user.name}
          </p>
          <img
            src={user.image_url}
            alt="User Avatar"
            className="aspect-square h-8 rounded-full object-cover ring-1 ring-foreground/10"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
        <DropdownMenuLabel className="p-0">
          <Link
            href="/protected/profile"
            className="flex items-center gap-3 rounded-sm p-2 transition-colors hover:bg-accent"
          >
            <img
              src={user.image_url}
              alt="User Avatar"
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">@{user.username}</p>
            </div>
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/protected/profile" className="cursor-pointer">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/protected/watch-history" className="cursor-pointer">
              <History className="h-4 w-4" />
              <span>History</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/protected/settings" className="cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
          <ThemeIcon className="h-4 w-4" />
          <span>Theme: {themeLabel}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfilePictureNew;
