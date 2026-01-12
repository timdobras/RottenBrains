'use client';

import { createClient } from '@/lib/supabase/client';
import { IUser } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface UserContextType {
  user: IUser | null;
  isLoading: boolean;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const fetchUser = async () => {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error) {
    logger.error('Error fetching user data:', error);
    throw error;
  }

  return userData as IUser;
};

const UserProvider = ({ children, initialUser }: { children: ReactNode; initialUser?: IUser }) => {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<IUser | null>({
    queryKey: ['user'],
    queryFn: fetchUser,
    initialData: initialUser,
  });

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      logger.debug('Auth state changed:', event);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

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
