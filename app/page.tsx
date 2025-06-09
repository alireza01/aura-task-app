import { createClient } from "@/lib/supabase/server"
import TaskDashboard from "@/components/views/task-dashboard"

export default async function Home() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Always show TaskDashboard - it handles guest mode internally
  return <TaskDashboard user={user} />
}
