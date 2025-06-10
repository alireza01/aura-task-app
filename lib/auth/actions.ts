// In lib/auth/actions.ts

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server' // Assuming this is the correct path
import { revalidatePath } from 'next/cache'

export async function mergeGuestAccount(guestId: string) {
  'use server'
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
