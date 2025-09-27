import { createClient } from "@/lib/supabase/server";
import { getUserFromDB } from "@/lib/supabase/serverQueries";
import { redirect } from "next/navigation";

export interface User {
  id: string;
  email: string;
  // Define other user details here
}
interface Props {
  user: User | null;
}

const getUser = async () => {
  let user: User | null = null;
  const supabase = await createClient();
  // Fetch user data from Supabase using the session cookie
  const { data: supabaseUser, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error fetching user:", error.message);
    return {
      redirect: {
        destination: "/login", // Redirect to login page if user is not authenticated
        permanent: false,
      },
    };
  }

  if (supabaseUser) {
    const dbUser = await getUserFromDB(supabaseUser.user.id);
    if (!dbUser) {
      const { error: insertError } = await supabase
        .from("users") // Replace 'profiles' with your actual table name
        .insert([
          {
            id: supabaseUser.user.id, // Use the user's unique ID from the sign-up
            email: supabaseUser.user.email,
            username: supabaseUser.user.user_metadata.name,
            name: supabaseUser.user.user_metadata.full_name,
            image_url: supabaseUser.user.user_metadata.picture,
            // Add any other fields you need to store
          },
        ]);
      if (insertError) {
        console.log("Error inserting user profile:", insertError.message);
      }
    }
    redirect("/");
  }

  return <div>HI</div>;
};

export default getUser;
