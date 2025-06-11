import { create } from 'zustand';

// Import actual slice creators and their types
import { createAuthSlice, AuthSlice } from './auth-slice';
import { createTasksSlice, TasksSlice } from './tasks-slice';
import { createGroupsSlice, GroupsSlice } from './groups-slice';
import { createTagsSlice, TagsSlice } from './tags-slice';
import { createSettingsSlice, SettingsSlice } from './settings-slice';
import { createUiSlice, UiSlice } from './ui-slice';

// Define the combined AppState type
export type AppState = AuthSlice &
  TasksSlice &
  GroupsSlice &
  TagsSlice &
  SettingsSlice &
  UiSlice;

// Create the Zustand store
export const useAppStore = create<AppState>((set, get) => ({
  ...createAuthSlice(set, get),
  ...createTasksSlice(set, get),
  ...createGroupsSlice(set, get),
  ...createTagsSlice(set, get),
  ...createSettingsSlice(set, get),
  ...createUiSlice(set),
}));

// Optional: Add debug subscription for development
if (process.env.NODE_ENV === 'development') {
  useAppStore.subscribe((state) => {
    const prevState = useAppStore.getState();
    const changedSlices: string[] = [];
    
    // Type-safe way to check for changes
    const stateKeys = Object.keys(state) as Array<keyof AppState>;
    stateKeys.forEach((key) => {
      if (state[key] !== prevState[key]) {
        changedSlices.push(key);
      }
    });

    if (changedSlices.length > 0) {
      // console.log('Changed parts of state:', changedSlices.join(', '));
    }
  });
}
