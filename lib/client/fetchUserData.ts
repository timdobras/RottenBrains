"use client";

import { useEffect, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { User } from "@supabase/supabase-js";
import { createClient } from "../supabase/client";

const supabase: SupabaseClient = createClient();

export default function fetchUserData() {
  // Define the state with an explicit type
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Define the async function to fetch user data
    async function getUser() {
      // Use try-catch for better error handling
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error("Error fetching user:", error.message);
          return;
        }

        if (data && data.user) {
          setUser(data.user);
        } else {
          console.log("No user found");
        }
      } catch (error) {
        console.error("Unexpected error fetching user:", error);
      }
    }

    getUser();
  }, []);
  return user;
}
