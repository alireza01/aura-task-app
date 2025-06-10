import { createClient } from '@/lib/supabase/client'; // Assuming client-side Supabase
import type { User } from '@supabase/supabase-js';

interface GuestConversionResult {
  success: boolean;
  error?: string | null;
  user?: User | null;
}

/**
 * Handles the conversion of a guest user to a registered user
 * by updating their email and password.
 * It also calls an API route to mark the user as non-guest in the user_profiles table.
 */
export async function handleGuestEmailPasswordSignUp(
  newEmail: string,
  newPassword?: string // Password might be optional if only email is being confirmed post-OAuth for example
): Promise<GuestConversionResult> {
  const supabase = createClient();

  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  if (getUserError || !user) {
    return { success: false, error: 'User not authenticated or error fetching user.' };
  }

  // Check if the current user is indeed a guest.
  // This can be done by checking their email or fetching their profile.
  // For simplicity, we'll assume if their email ends with '@auratask.guest', they are a guest.
  // A more robust check would involve fetching user_profiles.is_guest.
  const isCurrentEmailGuest = user.email?.endsWith('@auratask.guest');

  if (!isCurrentEmailGuest) {
    // This function is intended for guest conversion.
    // If the user is not a guest, let the standard sign-up flow handle it,
    // which might involve signing them out or showing an error.
    // For this function, we indicate it's not a guest.
    return { success: false, error: 'User is not a guest. Standard sign-up should be used.' };
  }

  if (!newPassword && !user.email?.endsWith('@auratask.guest')) {
    // If it's an existing user (not guest) and no password provided, this is not a valid update scenario here.
    // This check is somewhat redundant due to isCurrentEmailGuest but adds clarity.
     return { success: false, error: 'Password is required for non-guest email updates through this flow.' };
  }

  const updatePayload: { email: string; password?: string } = { email: newEmail };
  if (newPassword) {
    updatePayload.password = newPassword;
  }

  const { data: updatedUserData, error: updateUserError } = await supabase.auth.updateUser(updatePayload);

  if (updateUserError) {
    return { success: false, error: updateUserError.message, user: null };
  }

  if (updatedUserData?.user) {
    // User's auth record updated. Now mark them as non-guest in user_profiles.
    try {
      const response = await fetch('/api/user/set-registered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        // Even if this API call fails, the auth user was updated.
        // Log this error, but the primary conversion (auth user) was successful.
        // The client might need to handle this (e.g., user is effectively registered but profile flag is wrong).
        console.warn('User auth updated, but failed to set is_guest=false in profile:', result.error || response.statusText);
        // Potentially, you could try to revert the auth update or queue this profile update.
        // For now, returning success for auth update, with a note of profile update failure.
        return {
          success: true,
          user: updatedUserData.user,
          error: `User email/password updated, but failed to update profile status: ${result.error || response.statusText}`
        };
      }
      return { success: true, user: updatedUserData.user };
    } catch (e: any) {
      console.warn('Error calling /api/user/set-registered:', e.message);
      return {
        success: true,
        user: updatedUserData.user,
        error: `User email/password updated, but API call to update profile failed: ${e.message}`
      };
    }
  }

  return { success: false, error: 'Unknown error during user update.', user: null };
}

/*
Instruction for Integration:

This `handleGuestEmailPasswordSignUp` function should be used in your email/password sign-up form component.
Let's assume you have a component like `components/auth/EmailSignUpForm.tsx`.

Inside that component, when the user submits the form:
1. Get the current authenticated user: `const { data: { user } } = await supabase.auth.getUser();`
2. Check if this user is a guest. You can do this by:
   a. Checking their email: `user?.email?.endsWith('@auratask.guest')`
   b. OR, more robustly, by fetching their `user_profiles.is_guest` flag if you have that available on the client or via a quick API call.
      (The `is_guest` flag in `user_profiles` is recommended as the source of truth).

3. If they are a guest:
   Call `handleGuestEmailPasswordSignUp(newEmail, newPassword)` with the email and password from the form.
   Handle the result:
     - If `result.success` is true, the guest has been converted. You can redirect them, update UI state, etc.
       The `onAuthStateChange` listener should also pick up the user update.
     - If `result.error` exists, display it to the user.

4. If they are NOT a guest (i.e., `user` is null or `user.email` is not a guest email):
   Proceed with the standard sign-up flow: `await supabase.auth.signUp({ email, password, ... })`.

Example (conceptual, inside a hypothetical SignUpForm component's submit handler):

async function handleSubmit(formData) {
  const { newEmail, newPassword } = formData;
  const supabase = createClient(); // Or get from context

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  let isCurrentGuest = false;

  if (currentUser?.email?.endsWith('@auratask.guest')) {
    isCurrentGuest = true;
  } else if (currentUser) {
    // Optionally, fetch profile to check is_guest if email isn't definitive
    // const { data: profile } = await supabase.from('user_profiles').select('is_guest').eq('user_id', currentUser.id).single();
    // if (profile?.is_guest) isCurrentGuest = true;
  }


  if (isCurrentGuest) {
    const conversionResult = await handleGuestEmailPasswordSignUp(newEmail, newPassword);
    if (conversionResult.success) {
      // Handle successful conversion (e.g., redirect to dashboard)
      // toast.success("Account successfully registered!");
      // router.push('/dashboard');
    } else {
      // Display conversionResult.error to the user
      // toast.error(conversionResult.error);
    }
  } else {
    // Standard sign-up flow
    const { error: signUpError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      // options: { data: { is_guest: false } } // Not needed if trigger handles defaults and API updates is_guest
    });
    if (signUpError) {
      // Display signUpError.message
      // toast.error(signUpError.message);
    } else {
      // Handle successful new sign-up (e.g., show "check your email" message)
      // toast.success("Registration successful! Please check your email to verify.");
    }
  }
}
*/
