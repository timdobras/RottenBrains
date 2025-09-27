import { createClient } from "../supabase/client";

export const searchUsers = async (searchQuery: string) => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .ilike("username", `%${searchQuery}%`);
    if (error) {
      throw new Error(`Error searching users: ${error.message}`);
    }
    return data;
  } catch (error) {
    console.error("Error in searchUsers:", error);
    return null;
  }
};
