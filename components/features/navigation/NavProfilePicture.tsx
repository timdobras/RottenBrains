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
import { useUser } from '@/hooks/UserContext';
import { signOut } from '@/lib/supabase/clientQueries';
import { useToast } from '../../ui/use-toast';
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

  // Render a static placeholder during SSR / before hydration so that
  // browser extensions that rewrite DOM cannot cause a mismatch.
  if (!mounted) {
    return (
      <button className="outline-none">
        <img
          src={user.image_url}
          alt="User Avatar"
          className={`aspect-square rounded-full object-cover transition-opacity hover:opacity-80 ${imageSize}`}
        />
      </button>
    );
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

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="outline-none">
          <img
            src={user.image_url}
            alt="User Avatar"
            className={`aspect-square rounded-full object-cover transition-opacity hover:opacity-80 ${imageSize}`}
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
