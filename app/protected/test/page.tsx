import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserFromDB } from '@/lib/supabase/serverQueries';

const TestPage = async () => {
  const supabase = await createClient();
  const { data: supabaseUser, error } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    redirect('/login');
  }

  const dbUser = await getUserFromDB(supabaseUser.user.id);
  if (!dbUser) {
    const { error: insertError } = await supabase.from('users').insert([
      {
        id: supabaseUser.user.id,
        email: supabaseUser.user.email,
        username: supabaseUser.user.user_metadata.name,
        name: supabaseUser.user.user_metadata.full_name,
        image_url: supabaseUser.user.user_metadata.picture,
      },
    ]);
    if (insertError) {
      console.error('Error inserting user profile:', insertError.message);
      // Optional: handle insert error, maybe redirect to an error page
    }
  }

  // If the original intent was to redirect authenticated users away from this test page:
  redirect('/');

  // If the page should display something for the authenticated user,
  // you would return JSX here instead of the redirect above.
  // For example:
  // return (
  //   <div>
  //     <h1>Test Page</h1>
  //     <p>Welcome, {supabaseUser.user.email}</p>
  //   </div>
  // );
};

export default TestPage;
