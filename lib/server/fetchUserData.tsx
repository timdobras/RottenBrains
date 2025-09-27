import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

// Server-side function to fetch user data
export async function fetchUserDataServer() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("Error fetching user:", error.message);
      return null;
    }

    if (data && data.user) {
      return data.user;
    } else {
      console.log("No user found");
      return null;
    }
  } catch (error) {
    console.error("Unexpected error fetching user:", error);
    return null;
  }
}
