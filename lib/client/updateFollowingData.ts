"use client";

import { createClient } from "../supabase/client";

const supabase = createClient();

export const followUser = async (userId: string, user_to_follow_id: string) => {
  const { data, error } = await supabase
    .from("follows")
    .insert([{ user_id: userId, following_id: user_to_follow_id }]);

  if (error) {
    console.error("Error saving post:", error.message);
    return;
  } else {
    console.log("Post saved:", data);
  }

  return { data, error };
};

export const unFollowUser = async (
  userId: string,
  user_to_follow_id: string,
) => {
  const { data, error } = await supabase
    .from("follows")
    .delete()
    .eq("user_id", userId)
    .eq("following_id", user_to_follow_id);

  if (error) {
    console.error("Error removing save:", error.message);
  } else {
    console.log("Save removed:");
  }

  return { data, error };
};

export const getFollowStatus = async (
  userId: string,
  user_to_follow_id: string,
) => {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("user_id", userId)
    .eq("following_id", user_to_follow_id)
    .single();

  if (error) {
    return false;
  }

  return data !== null; // Return true if there's a record (post is saved), false otherwise
};
