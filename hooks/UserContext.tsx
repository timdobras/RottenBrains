'use client';

import { IUser } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface UserContextType {
  user: IUser | null;
  isLoading: boolean;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Read the current user from the Better Auth session (server source of truth),
// the SAME thing the server passes as `initialUser`. Previously this used the
// Supabase client, which returned null post-migration and made the client UI
// flip to logged-out/non-premium even with a valid Better Auth session.
const fetchUser = async (): Promise<IUser | null> => {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.user ?? null) as IUser | null;
  } catch (error) {
    logger.error('Error fetching user data:', error);
    return null;
  }
};

const UserProvider = ({ children, initialUser }: { children: ReactNode; initialUser?: IUser }) => {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<IUser | null>({
    queryKey: ['user'],
    queryFn: fetchUser,
    initialData: initialUser,
  });

  const refreshUser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }, [queryClient]);

  const contextValue = useMemo(
    () => ({ user: user || null, isLoading, refreshUser }),
    [user, isLoading, refreshUser]
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
