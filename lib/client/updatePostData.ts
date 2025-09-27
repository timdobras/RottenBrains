"use client";

import { createClient } from "../supabase/client";
import { PostgrestSingleResponse } from "@supabase/supabase-js";

const supabase = createClient();

const handleError = (operation: string, error: any) => {
  console.error(`Error during ${operation}:`, error.message);
};

export const savePost = async (
  userId: string,
  postId: string,
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("saves")
      .insert([{ user_id: userId, post_id: postId }]);
    if (error) throw error;
    console.log("Post saved:", data);
    return { data, error: null };
  } catch (error) {
    handleError("savePost", error);
    return { data: null, error };
  }
};

export const removeSave = async (
  userId: string,
  postId: string,
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("saves")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    if (error) throw error;
    console.log("Save removed");
    return { data, error: null };
  } catch (error) {
    handleError("removeSave", error);
    return { data: null, error };
  }
};

export const getSavedStatus = async (
  userId: string,
  postId: string,
): Promise<boolean> => {
  try {
    const { data, error }: PostgrestSingleResponse<any> = await supabase
      .from("saves")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .single();
    return data !== null;
  } catch (error) {
    return false;
  }
};

export const likePost = async (
  userId: string,
  postId: string,
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("likes")
      .insert([{ user_id: userId, post_id: postId }]);
    if (error) throw error;
    console.log("Post liked:", data);

    const { error: incrementError } = await supabase.rpc("increment_likes", {
      post_id: postId,
    });
    if (incrementError) throw incrementError;

    return { data, error: null };
  } catch (error) {
    handleError("likePost", error);
    return { data: null, error };
  }
};

export const removeLike = async (
  userId: string,
  postId: string,
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    if (error) throw error;
    console.log("Like removed");

    const { error: decrementError } = await supabase.rpc("decrement_likes", {
      post_id: postId,
    });
    if (decrementError) throw decrementError;

    return { data, error: null };
  } catch (error) {
    handleError("removeLike", error);
    return { data: null, error };
  }
};

export const getLikedStatus = async (
  userId: string,
  postId: string,
): Promise<boolean> => {
  try {
    const { data, error }: PostgrestSingleResponse<any> = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .single();
    return data !== null;
  } catch (error) {
    return false;
  }
};
