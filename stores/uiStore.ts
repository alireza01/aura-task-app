import { create } from 'zustand';

interface UIState {
  activeTab: string; // e.g., "all", "today", "important", "completed"
  searchQuery: string;
  filterGroupId: string | null;
  filterStatus: "all" | "completed" | "active";
  filterPriority: "all" | "high" | "medium" | "low";
  filterTagId: string | null;

  isAddTaskModalOpen: boolean;
  isEditTaskModalOpen: boolean;
  taskToEditId: string | null; // Store ID instead of full object to avoid stale data
  isSignInPromptModalOpen: boolean;
  isApiKeySetupModalOpen: boolean; // This might be triggered by settingsStore
  isSettingsPanelOpen: boolean;
  isTagsModalOpen: boolean;
  showFilters: boolean; // For the filter section visibility

  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterGroupId: (groupId: string | null) => void;
  setFilterStatus: (status: "all" | "completed" | "active") => void;
  setFilterPriority: (priority: "all" | "high" | "medium" | "low") => void;
  setFilterTagId: (tagId: string | null) => void;
  // ... other setters

  openAddTaskModal: () => void;
  closeAddTaskModal: () => void;
  openEditTaskModal: (taskId: string) => void;
  closeEditTaskModal: () => void;
  openSignInPromptModal: () => void;
  closeSignInPromptModal: () => void;
  openApiKeySetupModal: () => void;
  closeApiKeySetupModal: () => void;
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;
  openTagsModal: () => void;
  closeTagsModal: () => void;
  // ... other modal actions
  toggleFilters: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeTab: "all",
  searchQuery: "",
  filterGroupId: null,
  filterStatus: "all",
  filterPriority: "all",
  filterTagId: null,

  isAddTaskModalOpen: false,
  isEditTaskModalOpen: false,
  taskToEditId: null,
  isSignInPromptModalOpen: false,
  isApiKeySetupModalOpen: false,
  isSettingsPanelOpen: false,
  isTagsModalOpen: false,
  showFilters: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterGroupId: (groupId) => set({ filterGroupId: groupId }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setFilterTagId: (tagId) => set({ filterTagId: tagId }),
  // ... implement other setters

  openAddTaskModal: () => set({ isAddTaskModalOpen: true }),
  closeAddTaskModal: () => set({ isAddTaskModalOpen: false }),
  openEditTaskModal: (taskId) => set({ isEditTaskModalOpen: true, taskToEditId: taskId }),
  closeEditTaskModal: () => set({ isEditTaskModalOpen: false, taskToEditId: null }),
  openSignInPromptModal: () => set({ isSignInPromptModalOpen: true }),
  closeSignInPromptModal: () => set({ isSignInPromptModalOpen: false }),
  openApiKeySetupModal: () => set({ isApiKeySetupModalOpen: true }),
  closeApiKeySetupModal: () => set({ isApiKeySetupModalOpen: false }),
  openSettingsPanel: () => set({ isSettingsPanelOpen: true }),
  closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),
  openTagsModal: () => set({ isTagsModalOpen: true }),
  closeTagsModal: () => set({ isTagsModalOpen: false }),
  // ... implement other modal actions
  toggleFilters: () => set(state => ({ showFilters: !state.showFilters })),
}));
