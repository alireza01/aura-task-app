-- This function securely merges data from a guest account to a permanent one.
-- It requires the 'supabase_auth_admin' role to be able to delete the user.
-- Make sure the user running this has the required permissions or run as postgres user.
create or replace function merge_guest_data(guest_user_id uuid)
returns void
language plpgsql
security definer -- VERY IMPORTANT: This allows the function to run with the permissions of the user who defined it.
as $$
declare
  permanent_user_id uuid;
begin
  -- Get the ID of the currently authenticated user (the permanent account)
  select auth.uid() into permanent_user_id;

  -- Ensure we are not merging a user into themselves
  if guest_user_id = permanent_user_id then
    raise warning 'Attempted to merge a user into themselves. Aborting.';
    return;
  end if;

  -- Re-assign ownership of all data.
  -- Add a line here for EACH table that has a user_id column.
  update public.tasks set user_id = permanent_user_id where user_id = guest_user_id;
  update public.task_groups set user_id = permanent_user_id where user_id = guest_user_id;
  update public.tags set user_id = permanent_user_id where user_id = guest_user_id;
  -- ... add more tables as needed (e.g., settings, etc.)

  -- After merging, delete the old guest profile.
  delete from public.profiles where id = guest_user_id;

  -- Finally, delete the guest user from the auth schema.
  -- This requires admin privileges.
  -- The 'security definer' allows this to work securely.
  perform auth.admin_delete_user(guest_user_id);

  raise notice 'Successfully merged guest % into permanent user %', guest_user_id, permanent_user_id;
end;
$$;
