'use server';

// In lib/auth/actions.ts

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server' // Assuming this is the correct path
import { revalidatePath } from 'next/cache'

export async function mergeGuestAccount(guestId: string) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  console.log(`Server: Triggering merge for guest ID: ${guestId}`)

  const { error } = await supabase.rpc('merge_guest_data', {
    guest_user_id: guestId,
  })

  if (error) {
    console.error('Error merging guest account:', error)
    return { success: false, error: error.message }
  }

  console.log(`Server: Successfully merged guest ID: ${guestId}`)
  revalidatePath('/')
  return { success: true }
}

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
