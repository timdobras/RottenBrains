'use client';

import { SupabaseClient, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { createClient } from '../supabase/client';
import { logger } from '@/lib/logger';

const supabase: SupabaseClient = createClient();

export default function useUserData() {
  // Define the state with an explicit type
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Define the async function to fetch user data
    async function getUser() {
      // Use try-catch for better error handling
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          logger.error('Error fetching user:', error.message);
          return;
        }

        if (data && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        logger.error('Unexpected error fetching user:', error);
      }
    }

    getUser();
  }, []);
  return user;
}
