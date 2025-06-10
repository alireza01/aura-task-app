import { createClient } from "@/lib/supabase/client";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const signOut = async (router: AppRouterInstance) => {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.push("/"); // Redirect to homepage after sign out
  router.refresh(); // Refresh the page to update auth state
};
