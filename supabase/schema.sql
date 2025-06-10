-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id_to_check UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.user_profiles WHERE user_id = user_id_to_check;
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create tables
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  is_guest BOOLEAN DEFAULT true, -- Added for guest conversion tracking
  nickname TEXT,
  has_set_nickname BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gemini_api_key TEXT,
  speed_weight INTEGER DEFAULT 50,
  importance_weight INTEGER DEFAULT 50,
  auto_ranking BOOLEAN DEFAULT true,
  auto_subtasks BOOLEAN DEFAULT true,
  auto_tagging BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS task_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES task_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  speed_score INTEGER,
  importance_score INTEGER,
  emoji TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (task_id, tag_id)
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Create policies
-- user_profiles policies
CREATE POLICY "Users can select their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to update mutable parts of their profile like nickname
CREATE POLICY "Users can update their own mutable profile data" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    NEW.role = OLD.role AND -- Role cannot be changed by user
    NEW.is_guest = OLD.is_guest -- is_guest status cannot be changed by this policy
    -- nickname and has_set_nickname can be changed by this policy
  );

CREATE POLICY "Admins can select all user profiles" ON user_profiles
  FOR SELECT USING (is_admin(auth.uid()));

-- Policy specifically for a user to convert themselves from guest to registered
CREATE POLICY "Users can convert from guest to registered" ON public.user_profiles
  FOR UPDATE USING (
    auth.uid() = user_id AND
    OLD.is_guest = true -- User must currently be a guest
  )
  WITH CHECK (
    auth.uid() = user_id AND
    NEW.is_guest = false AND -- The only change allowed by this policy is setting is_guest to false
    NEW.role = OLD.role AND -- All other fields must remain unchanged by this policy
    NEW.nickname = OLD.nickname AND
    NEW.has_set_nickname = OLD.has_set_nickname
    -- created_at and updated_at are handled by defaults/triggers
  );
-- Note: Role updates are intentionally omitted from RLS for now.

-- admin_api_keys policies
CREATE POLICY "Admins can manage API keys" ON admin_api_keys
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- user_settings policies
CREATE POLICY "Users can select their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can select all user settings" ON user_settings
  FOR SELECT USING (is_admin(auth.uid()));

-- task_groups policies
CREATE POLICY "Users can select their own groups" ON task_groups
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own groups" ON task_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own groups" ON task_groups
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own groups" ON task_groups
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can select all task groups" ON task_groups
  FOR SELECT USING (is_admin(auth.uid()));

-- tasks policies
CREATE POLICY "Users can select their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can select all tasks" ON tasks
  FOR SELECT USING (is_admin(auth.uid()));

-- subtasks policies
CREATE POLICY "Users can select subtasks of their tasks" ON subtasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
    ) OR is_admin(auth.uid()) -- Admins can select all subtasks
  );
CREATE POLICY "Users can insert subtasks for their own tasks" ON subtasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update subtasks of their tasks" ON subtasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete subtasks of their tasks" ON subtasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
    )
  );
-- Note: Admin policies for subtasks insert/update/delete can be added if needed,
-- but typically admins would manage tasks that own subtasks or use direct DB access.

-- tags policies
CREATE POLICY "Users can select their own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can select all tags" ON tags
  FOR SELECT USING (is_admin(auth.uid()));

-- task_tags policies
CREATE POLICY "Users can select their own task_tags" ON task_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid()
    ) OR is_admin(auth.uid()) -- Admins can select all task_tags
  );
CREATE POLICY "Users can insert task_tags for their own tasks" ON task_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = task_tags.tag_id AND tags.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update task_tags for their own tasks" ON task_tags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = task_tags.tag_id AND tags.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete task_tags for their own tasks" ON task_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_guest ON user_profiles(is_guest); -- Index for is_guest
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_api_key ON admin_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_is_active ON admin_api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_task_groups_user_id ON task_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_completed ON tasks(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON subtasks(completed);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_api_keys_updated_at
  BEFORE UPDATE ON admin_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_groups_updated_at
  BEFORE UPDATE ON task_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile and settings on new auth.users creation
CREATE OR REPLACE FUNCTION create_public_user_profile_and_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user.
  -- `is_guest` will default to true. `role` defaults to 'user'.
  -- Nickname derived from email or set to 'New User'.
  INSERT INTO public.user_profiles (user_id, nickname, has_set_nickname)
  VALUES (NEW.id,
          COALESCE(NULLIF(substring(NEW.email from '(.*)@'), ''), 'New User'), -- Extracts part before @, defaults if empty or no @
          false);

  -- Create settings for the new user
  -- Relies on default values in user_settings table
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on new user creation
-- Ensure this trigger is created in the 'auth' schema context if needed, or use fully qualified names.
-- For now, assuming it can be created from the public schema context if Supabase allows.
-- If auth.users is in a different schema and direct triggers aren't allowed from public,
-- this might need to be installed via a migration script with appropriate permissions.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_public_user_profile_and_settings();