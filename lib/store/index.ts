import { create, StoreApi } from 'zustand';

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
export const useAppStore = create<AppState>((
  set: StoreApi<AppState>['setState'],
  get: StoreApi<AppState>['getState']
) => ({
  ...createAuthSlice(set, get),
  ...createTasksSlice(set, get),
  ...createGroupsSlice(set, get),
  ...createTagsSlice(set, get),
  ...createSettingsSlice(set, get),
  ...createUiSlice(set, get),
}));

// Optional: Add debug subscription for development
if (process.env.NODE_ENV === 'development') {
  useAppStore.subscribe(
    (state, prevState) => {
      // Using a simple log for now. Consider a more robust logging mechanism if needed.
      // console.log('AppStore changed:', { state, prevState });

      // Example: Log which slice might have changed (shallow comparison of top-level properties)
      const changedSlices: string[] = [];
      for (const key in state) {
        if (prevState.hasOwnProperty(key) && state[key] !== prevState[key]) {
          // This is a very basic check. For objects/arrays, it will always show as changed if the reference changes.
          // For more detailed diffing, a library or a more complex diff function would be needed.
          // changedSlices.push(key.replace('Slice', '')); // Example to shorten names
        }
      }
      if (changedSlices.length > 0) {
        // console.log('Changed parts of state:', changedSlices.join(', '));
      }
    },
    // Optional: specify which parts of the state to observe for this subscription
    // (state) => ({ user: state.user, tasks: state.tasks.length }) // Example selector
  );
}
