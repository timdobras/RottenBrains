import { createClient } from '../supabase/client';
import { logger } from '@/lib/logger';

export const searchUsers = async (searchQuery: string) => {
  const supabase = createClient();
  try {
    // Search both username and display_name for better results
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(10);

    if (error) {
      throw new Error(`Error searching users: ${error.message}`);
    }

    // Rank results: exact matches first, then starts-with, then contains
    const ranked = data?.sort((a: any, b: any) => {
      const aUsername = a.username?.toLowerCase() || '';
      const bUsername = b.username?.toLowerCase() || '';
      const aDisplayName = a.display_name?.toLowerCase() || '';
      const bDisplayName = b.display_name?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();

      // Exact match
      if (aUsername === query || aDisplayName === query) return -1;
      if (bUsername === query || bDisplayName === query) return 1;

      // Starts with
      if (aUsername.startsWith(query) || aDisplayName.startsWith(query)) return -1;
      if (bUsername.startsWith(query) || bDisplayName.startsWith(query)) return 1;

      return 0;
    });

    return ranked;
  } catch (error) {
    logger.error('Error in searchUsers:', error);
    return null;
  }
};
