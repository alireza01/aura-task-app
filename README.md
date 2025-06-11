# AuraTask: Advanced Task Management Application

AuraTask is a modern, feature-rich task management application designed to help users organize their tasks, collaborate within groups, and leverage AI for enhanced productivity. Built with Next.js, React, and Supabase, AuraTask offers a seamless and intuitive user experience with real-time updates and customizable themes.

## Features

*   **Comprehensive Task Management:** Create, edit, delete, and mark tasks as complete. Organize tasks with due dates, priorities, and tags.
*   **Group Organization:** Create and manage task groups, assign tasks to specific groups, and collaborate with others.
*   **AI Integration:** Leverage AI capabilities for task processing, intelligent suggestions, and automated group emoji assignments.
*   **Custom Themes:** Personalize your experience with a variety of custom themes, including "Alireza" and "Neda," featuring unique visual effects like glassmorphism and bubbly animations.
*   **Real-time Updates:** Enjoy a dynamic experience with real-time synchronization of tasks and groups, powered by Supabase Realtime.
*   **Subtasks:** Break down complex tasks into smaller, manageable subtasks for better organization.
*   **User Authentication:** Securely manage your tasks with user authentication powered by Supabase Auth.
*   **Responsive Design:** A beautiful and functional interface across all devices.

## Setup

To get AuraTask up and running on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/auratask.git
    cd auratask
    ```
2.  **Install dependencies:**
    AuraTask uses `pnpm` as its package manager. If you don't have `pnpm` installed, you can install it via npm:
    ```bash
    npm install -g pnpm
    ```
    Then, install the project dependencies:
    ```bash
    pnpm install
    ```
3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of your project and add the required environment variables as described in the "Environment Variables" section below.
4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Environment Variables

AuraTask requires the following environment variables to function correctly. Create a `.env.local` file in the root of your project and populate it with your values:

*   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase project's public anon key.
*   `GEMINI_API_KEY`: Your Google Gemini API key for AI integration.

**Example .env.local:**

```
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
GEMINI_API_KEY="your-gemini-api-key"
```

## Database Setup (Supabase)

AuraTask uses Supabase for its backend. You'll need to set up a Supabase project and configure your database schema.

1.  **Create a Supabase Project:** Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Apply Schema:** You can find the database schema in [`supabase/schema.sql`](supabase/schema.sql). You can either:
    *   Copy and paste the content of `schema.sql` into the SQL Editor in your Supabase project dashboard and run it.
    *   Use the Supabase CLI to link your local project and push the schema.
3.  **Configure Row Level Security (RLS):** Ensure RLS is enabled for all relevant tables and policies are set up to control data access based on user authentication. Refer to the Supabase documentation for detailed RLS setup.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
