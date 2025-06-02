import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import TaskDashboard from "@/components/task-dashboard"

export default async function Home() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Always show TaskDashboard - it handles guest mode internally
  return <TaskDashboard user={user} />
}
