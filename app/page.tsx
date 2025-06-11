import { createClient } from "@/lib/supabase/server"
import TaskDashboard from "@/components/task-dashboard"

export default async function Home() {
  const supabase = createClient()

  await supabase.auth.getUser()

  // TaskDashboard now handles user state internally through the store
  return <TaskDashboard />
}
