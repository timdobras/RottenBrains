'use client';

import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
import { logger } from '@/lib/logger';

const supabase = createClient();

const handleError = (operation: string, error: any) => {
  logger.error(`Error during ${operation}:`, error.message);
};

export const savePost = async (
  userId: string,
  postId: string
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('saves')
      .insert([{ user_id: userId, post_id: postId }]);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    handleError('savePost', error);
    return { data: null, error };
  }
};

export const removeSave = async (
  userId: string,
  postId: string
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('saves')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    handleError('removeSave', error);
    return { data: null, error };
  }
};

export const getSavedStatus = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const { data, error }: PostgrestSingleResponse<any> = await supabase
      .from('saves')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    return data !== null;
  } catch (error) {
    return false;
  }
};

// Like a post. Idempotent: the (user_id, post_id) unique constraint plus
// ignoreDuplicates means liking an already-liked post is a no-op instead of an
// error or a duplicate row. posts.total_likes is maintained by the DB trigger
// `trg_likes_count`, so the client no longer touches the counter (the old
// increment_likes RPC is now a no-op).
export const likePost = async (
  userId: string,
  postId: string
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .upsert([{ user_id: userId, post_id: postId }], {
        onConflict: 'user_id,post_id',
        ignoreDuplicates: true,
      });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    handleError('likePost', error);
    return { data: null, error };
  }
};

export const removeLike = async (
  userId: string,
  postId: string
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw error;
    // total_likes is decremented by the DB trigger `trg_likes_count`.
    return { data, error: null };
  } catch (error) {
    handleError('removeLike', error);
    return { data: null, error };
  }
};

export const getLikedStatus = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const { data, error }: PostgrestSingleResponse<any> = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    return data !== null;
  } catch (error) {
    return false;
  }
};
