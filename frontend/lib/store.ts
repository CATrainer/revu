import { create } from 'zustand';
import type { FiltersState, Interaction, NotificationItem, Theme, User, Workspace } from './types';

interface StoreState {
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  interactions: Interaction[];
  filters: FiltersState;
  selectedItems: string[];
  aiSuggestions: Record<string, string[]>; // key: interactionId
  notifications: { unread: number; items: NotificationItem[] };
  theme: Theme;

  setCurrentUser: (user: User | null) => void;
  setWorkspaces: (ws: Workspace[]) => void;
  setCurrentWorkspace: (wsId: string) => void;
  setInteractions: (items: Interaction[]) => void;
  addInteractions: (items: Interaction[]) => void;
  updateInteraction: (id: string, patch: Partial<Interaction>) => void;
  setFilters: (patch: Partial<FiltersState>) => void;
  toggleSelect: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  cacheAISuggestion: (id: string, suggestion: string) => void;
  addNotification: (n: NotificationItem) => void;
  markNotificationsRead: () => void;
  setTheme: (t: Theme) => void;
}

export const useStore = create<StoreState>((set) => ({
  currentUser: null,
  currentWorkspace: null,
  workspaces: [],
  interactions: [],
  filters: {
    platforms: [],
    sentiment: 'All',
    status: 'All',
    search: '',
    dateRange: {},
  },
  selectedItems: [],
  aiSuggestions: {},
  notifications: { unread: 0, items: [] },
  theme: 'system',

  setCurrentUser: (user) => set({ currentUser: user }),
  setWorkspaces: (ws) => set({ workspaces: ws, currentWorkspace: ws[0] ?? null }),
  setCurrentWorkspace: (wsId) =>
    set((state) => ({ currentWorkspace: state.workspaces.find((w) => w.id === wsId) || null })),
  setInteractions: (items) => set({ interactions: items }),
  addInteractions: (items) => set((s) => ({ interactions: [...items, ...s.interactions] })),
  updateInteraction: (id, patch) =>
    set((s) => ({
      interactions: s.interactions.map((i) => (i.id === id ? ({ ...i, ...patch } as Interaction) : i)),
    })),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  toggleSelect: (id) =>
    set((s) => ({
      selectedItems: s.selectedItems.includes(id)
        ? s.selectedItems.filter((x) => x !== id)
        : [...s.selectedItems, id],
    })),
  setSelection: (ids) => set({ selectedItems: ids }),
  clearSelection: () => set({ selectedItems: [] }),
  cacheAISuggestion: (id, suggestion) =>
    set((s) => ({ aiSuggestions: { ...s.aiSuggestions, [id]: [...(s.aiSuggestions[id] || []), suggestion] } })),
  addNotification: (n) => set((s) => ({ notifications: { unread: s.notifications.unread + 1, items: [n, ...s.notifications.items] } })),
  markNotificationsRead: () => set((s) => ({ notifications: { ...s.notifications, unread: 0 } })),
  setTheme: (t) => set({ theme: t }),
}));
