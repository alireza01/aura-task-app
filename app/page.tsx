// app/page.tsx
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { User, UserSettings, TaskGroup, Task, Tag, GuestUser } from "@/types";
import Header from "@/components/header";
import TaskDashboard from "@/components/task-dashboard";
import SettingsPanel from "@/components/settings/settings-panel";
import ArchiveView from "@/components/archive-view";
import SignInPromptModal from "@/components/signin-prompt-modal";
import ApiKeySetupTrigger from "@/components/auth/api-key-setup-trigger";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore }); // Corrected client creation
  const { data: { user } } = await supabase.auth.getUser();

  let settings: UserSettings | null = null;
  let groups: TaskGroup[] = [];
  let tasks: Task[] = [];
  let tags: Tag[] = [];
  let isApiKeySet = false; // Default to false

  if (user) {
    // Fetch user settings, including the encrypted API key
    const { data: userSettingsData } = await supabase
      .from("user_settings")
      .select("*, encrypted_gemini_api_key") // Ensure this column is selected
      .eq("user_id", user.id)
      .single();
    settings = userSettingsData as UserSettings;

    // Determine if API key is set
    if (settings && (settings as any).encrypted_gemini_api_key) {
      isApiKeySet = true;
    }
    // It's important NOT to pass the encrypted_gemini_api_key itself to the client components.
    // Delete it from the settings object after checking its presence.
    if (settings && (settings as any).encrypted_gemini_api_key) {
      delete (settings as any).encrypted_gemini_api_key;
    }


    // Fetch groups, tasks, and tags
    const [
      { data: groupsData },
      { data: tasksData },
      { data: tagsData }
    ] = await Promise.all([
      supabase.from("task_groups").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("tasks").select("*, subtasks(*), tags(tags(*))").eq("user_id", user.id).order("order_index"), // Corrected tags selection in tasks
      supabase.from("tags").select("*").eq("user_id", user.id).order("name")
    ]);

    groups = groupsData || [];
    tasks = tasksData?.map(task => ({
      ...task,
      tags: task.tags?.map((t: any) => t.tags) || [],
      subtasks: task.subtasks || []
    })) || [];
    tags = tagsData || [];

  } else {
    // Handle guest user data if necessary (currently, API key is user-specific)
  }

  const guestUser: GuestUser | null = user ? null : { id: "guest", isGuest: true };


  return (
    <>
      <Header user={user} />
      <main className="container mx-auto px-4 py-8 md:py-12">
        {user ? (
          <>
            <TaskDashboard
              user={user}
              guestUser={guestUser}
              initialGroups={groups}
              initialTasks={tasks}
              initialTags={tags}
              settings={settings}
              isApiKeySet={isApiKeySet} // Pass down
            />
            <SettingsPanel
              user={user}
              settings={settings}
              isApiKeySet={isApiKeySet} // Pass down
            />
            <ArchiveView
              user={user}
              guestUser={guestUser}
              initialTasks={tasks}
              initialGroups={groups}
              initialTags={tags}
              settings={settings}
            />
            <ApiKeySetupTrigger user={user} />
          </>
        ) : (
          <SignInPromptModal />
        )}
      </main>
    </>
  );
}
