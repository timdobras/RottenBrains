'use client';

import { createClient } from '../supabase/client';
import { logger } from '@/lib/logger';

const supabase = createClient();

export const followUser = async (userId: string, user_to_follow_id: string) => {
  const { data, error } = await supabase
    .from('follows')
    .insert([{ user_id: userId, following_id: user_to_follow_id }]);

  if (error) {
    logger.error('Error following user:', error.message);
    return;
  }

  return { data, error };
};

export const unFollowUser = async (userId: string, user_to_follow_id: string) => {
  const { data, error } = await supabase
    .from('follows')
    .delete()
    .eq('user_id', userId)
    .eq('following_id', user_to_follow_id);

  if (error) {
    logger.error('Error unfollowing user:', error.message);
  }

  return { data, error };
};

export const getFollowStatus = async (userId: string, user_to_follow_id: string) => {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('user_id', userId)
    .eq('following_id', user_to_follow_id)
    .single();

  if (error) {
    return false;
  }

  return data !== null; // Return true if there's a record (post is saved), false otherwise
};
