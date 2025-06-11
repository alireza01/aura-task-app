'use server';

// In lib/auth/actions.ts

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server' // Assuming this is the correct path
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation';

export async function createGuestUser() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore); // Uses the server client via cookies

  // Generate random credentials for the guest user
  // In a real app, you might want a more robust way to handle guest identities
  const email = `guest_${Math.random().toString(36).substring(2, 15)}@example.com`;
  const password = Math.random().toString(36).substring(2, 15);

  console.log(`Server: Attempting to create guest user with email: ${email}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // You might want to add specific metadata for guest users if your DB schema supports it
      // data: { is_anonymous: true, guest_id: uuidv4() } // Example
    },
  });

  if (error) {
    console.error('Error creating guest user:', error);
    return { success: false, error: error.message };
  }

  if (data.user) {
    console.log(`Server: Successfully created guest user ID: ${data.user.id}`);
    // Revalidate relevant paths if necessary, e.g., if guest status affects displayed UI
    // revalidatePath('/');
    return { success: true, userId: data.user.id };
  }

  // Fallback if user data is unexpectedly missing
  console.error('Error creating guest user: No user data returned.');
  return { success: false, error: 'Failed to create guest user: No user data.' };
}

export async function signOut() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  console.log('Server: Attempting to sign out user.');

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    // Potentially return an error object or throw, though redirecting is common
    return { success: false, error: error.message };
  }

  console.log('Server: User signed out successfully.');
  revalidatePath('/', 'layout'); // Revalidate the entire site
  redirect('/');
  // Note: redirect should be called outside of a try/catch block if it throws an error itself
  // For server actions, returning a simple object might be safer if redirect isn't always desired immediately.
  // However, for signOut, a redirect is typical.
  // The Vercel build might have issues if redirect() is used without 'use server' at the top of the file.
  // But since 'use server' is already at the top of 'lib/auth/actions.ts', this should be fine.
}
