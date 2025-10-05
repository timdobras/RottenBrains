'use client';

import { createClient } from '@/lib/supabase/client';
import { IUser } from '@/types';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import { logger } from '@/lib/logger';

interface UserContextType {
  user: IUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const UserProvider = ({ children, initialUser }: { children: ReactNode; initialUser?: IUser }) => {
  const [user, setUser] = useState<IUser | null>(initialUser || null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const router = useRouter();

  // Memoize refreshUser to prevent unnecessary re-renders
  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        logger.error('Error fetching user data:', error);
        setUser(null);
        return;
      }

      setUser(userData as IUser);
    } catch (error) {
      logger.error('Error in refreshUser:', error);
      setUser(null);
    }
  }, [supabase]);

  useEffect(() => {
    // Set initial loading state based on whether we have initial user
    if (initialUser) {
      setLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Auth state changed:', event);

      if (session?.user) {
        // Only fetch user data if user ID changed
        if (!user || String(user.id) !== session.user.id) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            logger.error('Error fetching user on auth change:', error);
            setUser(null);
          } else {
            setUser((userData as IUser) || null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, initialUser, user, refreshUser]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ user, loading, refreshUser }),
    [user, loading, refreshUser]
  );

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserProvider;
