import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// TODO: The signOut function uses the client supabase client, this should be updated to use the server client.
// Also, the signOut function is designed for client-side redirection using `router.push`.
// For server-side actions, simple `redirect` from `next/navigation` is often preferred if no client-side router interaction is needed post-signout.
export const signOut = async (router: AppRouterInstance) => {
  const supabase = createClient(cookies());
  await supabase.auth.signOut();
  router.push("/"); // Redirect to homepage after sign out
  router.refresh(); // Refresh the page to update auth state
};

'use server'

export async function createGuestUser() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user: existingUser } } = await supabase.auth.getUser()
  if (existingUser) {
    // User already has a session, do nothing.
    return { user: existingUser, error: null }
  }

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    console.error('Error creating guest user:', error)
    return { user: null, error: error.message }
  }

  if (data.user) {
    // Create a profile entry for the guest user in user_profiles table.
    const { error: profileError } = await supabase.from('user_profiles').insert({
      user_id: data.user.id, // Corrected: PK is user_id
      // full_name: 'Guest', // 'full_name' is not in user_profiles schema, nickname is used.
      nickname: 'Guest', // Corrected: use nickname column
      is_guest: true,
      has_set_nickname: false, // Guest users haven't set a nickname yet.
    })

    if (profileError) {
      console.error('Error creating guest user profile:', profileError)
      // Even if profile creation fails, the auth user exists.
      // Depending on RLS and app logic, this might cause issues later.
      // A robust solution might handle this, e.g., by deleting the auth user if profile creation is critical.
    }
  }

  return { user: data.user, error: null }
}

export async function linkGoogleAccount() {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Construct the redirectTo URL.
    // Ensure NEXT_PUBLIC_SITE_URL is set in your environment variables.
    // If not, provide a default or handle the error.
    let redirectURL = process.env.NEXT_PUBLIC_SITE_URL
    if (!redirectURL) {
        console.warn("NEXT_PUBLIC_SITE_URL is not set. Using a default relative path for redirection. This might not work as expected in all environments.");
        // Fallback to a relative path (though absolute is preferred by Supabase for OAuth)
        redirectURL = '/auth/callback';
    } else {
        redirectURL = `${redirectURL.replace(/\/$/, '')}/auth/callback`; // Ensure no trailing slash before adding /auth/callback
    }


    const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
            redirectTo: redirectURL,
        },
    })

    if (error) {
        console.error("Error linking Google Account:", error.message)
        // Consider how to surface this error to the user.
        // Maybe redirect to a page with an error message: redirect('/auth/error?message=' + encodeURIComponent(error.message))
        // For now, just returning it as per the plan.
        return { error: error.message }
    }

    if (data.url) {
        redirect(data.url) // Server-side redirect
    } else {
        // This case should ideally not happen if there's no error.
        // Log it for debugging.
        console.warn("No redirect URL returned from linkIdentity despite no error.")
        return { error: "Failed to get redirect URL for Google sign-in." }
    }

    // This part of the function might not be reached if redirect() is called,
    // as redirect() throws an error to stop further execution.
    // However, having a return statement is good practice.
    return {}
}

export async function updateNickname(nickname: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in to update your nickname.', success: false };
    }

    // Validate nickname format (basic example)
    if (!nickname || nickname.length < 3 || nickname.length > 50) {
        return { error: 'Nickname must be between 3 and 50 characters.', success: false };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
        return { error: 'Nickname can only contain letters, numbers, and underscores.', success: false };
    }


    // Check if the nickname is already taken by a non-guest user.
    const { data: existingProfile, error: existingError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('nickname', nickname)
        .eq('is_guest', false) // Only check against non-guest users
        .neq('user_id', user.id) // Exclude the current user's profile
        .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116: 'single' row not found (means nickname is not taken or taken by current user)
        console.error('Error checking existing nickname:', existingError);
        return { error: 'An error occurred while checking the nickname. Please try again.', success: false };
    }

    if (existingProfile) {
        return { error: 'This nickname is already taken. Please choose another one.', success: false };
    }

    // Update the profile for the current user.
    const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
            nickname: nickname,
            is_guest: false, // Setting a nickname implies they are no longer a "new" guest in this context
            has_set_nickname: true,
        })
        .eq('user_id', user.id);

    if (updateError) {
        console.error("Error updating nickname:", updateError);
        // Check if RLS is preventing the update
        if (updateError.message.includes("new row violates row-level security policy")) {
             return { error: 'Failed to update nickname due to a security policy. Please ensure you are allowed to make this change.', success: false };
        }
        return { error: 'An error occurred while setting the nickname. Please try again.', success: false };
    }

    revalidatePath('/');
    revalidatePath('/settings');
    return { error: null, success: true, message: "Nickname updated successfully!" };
}
