import { StoreApi } from 'zustand';
import type { Task } from '@/types';
import { AppState } from './index';

export interface UiSliceState {
  isSettingsPanelOpen: boolean;
  isTaskModalOpen: boolean;
  isTagsModalOpen: boolean;
  isSignInPromptOpen: boolean;
  isApiKeySetupModalOpen: boolean;
  isNicknameModalOpen: boolean;
  taskToEdit: Task | null;
  taskModalMode: 'add' | 'edit';
  showFilters: boolean;

  // Actions
  toggleSettingsPanel: () => void;
  openTaskModal: (mode: 'add' | 'edit', task?: Task) => void;
  closeTaskModal: () => void;
  toggleTagsModal: () => void;
  openSignInPrompt: () => void;
  closeSignInPrompt: () => void;
  openApiKeySetupModal: () => void;
  closeApiKeySetupModal: () => void;
  openNicknameModal: () => void;
  closeNicknameModal: () => void;
  toggleShowFilters: () => void;
  setTaskToEdit: (task: Task | null) => void;
  setTaskModalMode: (mode: 'add' | 'edit') => void;
}

export type UiSlice = UiSliceState;

export const createUiSlice = (
  set: StoreApi<AppState>['setState'],
  get: StoreApi<AppState>['getState'] // get is not used in this slice, but included for consistency
): UiSlice => ({
  // Initial State
  isSettingsPanelOpen: false,
  isTaskModalOpen: false,
  isTagsModalOpen: false,
  isSignInPromptOpen: false,
  isApiKeySetupModalOpen: false,
  isNicknameModalOpen: false,
  taskToEdit: null,
  taskModalMode: 'add',
  showFilters: false,

  // Actions
  toggleSettingsPanel: () =>
    set((state) => ({ isSettingsPanelOpen: !state.isSettingsPanelOpen })),
  openTaskModal: (mode, task) =>
    set({
      isTaskModalOpen: true,
      taskModalMode: mode,
      taskToEdit: task || null,
    }),
  closeTaskModal: () =>
    set({
      isTaskModalOpen: false,
      taskToEdit: null,
      taskModalMode: 'add',
    }),
  toggleTagsModal: () =>
    set((state) => ({ isTagsModalOpen: !state.isTagsModalOpen })),
  openSignInPrompt: () => set({ isSignInPromptOpen: true }),
  closeSignInPrompt: () => set({ isSignInPromptOpen: false }),
  openApiKeySetupModal: () => set({ isApiKeySetupModalOpen: true }),
  closeApiKeySetupModal: () => set({ isApiKeySetupModalOpen: false }),
  openNicknameModal: () => set({ isNicknameModalOpen: true }),
  closeNicknameModal: () => set({ isNicknameModalOpen: false }),
  toggleShowFilters: () =>
    set((state) => ({ showFilters: !state.showFilters })),
  setTaskToEdit: (task) => set({ taskToEdit: task }),
  setTaskModalMode: (mode) => set({ taskModalMode: mode }),
});
