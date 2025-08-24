import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ReplyTemplate,
  SavedView,
  NoteItem,
  GoalsState,
  WhatIfState,
  IntegrationConnection,
} from './types';
import type { FiltersState, Interaction, NotificationItem, NotificationPrefs, Theme, User, Workspace } from './types';

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
  // Demo UX state
  tour: { completed: boolean; step: number };
  scenario: 'creator' | 'business' | 'agency-creators' | 'agency-businesses';
  onboarding: { tasks: { id: string; title: string; done: boolean }[] };
  templates: ReplyTemplate[];
  savedViews: SavedView[];
  notes: Record<string, NoteItem[]>; // by interaction id
  goals: GoalsState;
  whatIf: WhatIfState;
  integrations: IntegrationConnection[];
  notificationPrefs: NotificationPrefs;
  // UI prefs
  badgeRespectsMute: boolean;
  demoBannerDismissed: boolean;

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
  markNotificationRead: (id: string) => void;
  markNotificationsRead: () => void;
  setTheme: (t: Theme) => void;
  // New actions
  setTour: (patch: Partial<{ completed: boolean; step: number }>) => void;
  setScenario: (s: StoreState['scenario']) => void;
  setOnboardingTask: (id: string, done: boolean) => void;
  addTemplate: (t: ReplyTemplate) => void;
  removeTemplate: (id: string) => void;
  addSavedView: (v: SavedView) => void;
  removeSavedView: (id: string) => void;
  addNote: (interactionId: string, note: NoteItem) => void;
  setGoals: (g: Partial<GoalsState>) => void;
  setWhatIf: (w: Partial<WhatIfState>) => void;
  setIntegrationStatus: (id: IntegrationConnection['id'], patch: Partial<IntegrationConnection>) => void;
  setNotificationPrefs: (p: Partial<NotificationPrefs>) => void;
  setBadgeRespectsMute: (v: boolean) => void;
  setDemoBannerDismissed: (v: boolean) => void;
}

export const useStore = create<StoreState>()(
  persist(
  (set) => ({
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
  tour: { completed: false, step: 0 },
  scenario: 'business',
  onboarding: {
    tasks: [
      { id: 'connect', title: 'Connect an account', done: false },
      { id: 'automation', title: 'Create an automation rule', done: false },
      { id: 'invite', title: 'Invite a teammate', done: false },
    ],
  },
  templates: [
    { id: 't1', name: 'Thanks (5-star)', content: 'Thanks so much for the 5-star review! We appreciate you.', tone: 'Friendly' },
    { id: 't2', name: 'Make it right', content: 'Sorry to hear this. Please email support@yourbusiness.com so we can help.', tone: 'Empathetic' },
  ],
  savedViews: [],
  notes: {},
  goals: { avgRatingTarget: 4.6, responseTimeTargetMins: 60, reviewsPerMonthTarget: 120 },
  whatIf: { responseTimeDeltaPct: 0, replyRateDeltaPct: 0 },
  integrations: [
    { id: 'google', name: 'Google Business', connected: false, status: 'pending' },
    { id: 'facebook', name: 'Facebook', connected: false, status: 'pending' },
    { id: 'instagram', name: 'Instagram', connected: false, status: 'pending' },
  ],
  notificationPrefs: { muteKeywords: ['refund','delay'], mutedPlatforms: [], mode: 'All' },
  badgeRespectsMute: false,
  demoBannerDismissed: false,

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
  addNotification: (n) =>
    set((s) => ({
      notifications: {
        unread: s.notifications.unread + (n.read ? 0 : 1),
        items: [{ ...n, read: !!n.read }, ...s.notifications.items],
      },
    })),
  markNotificationRead: (id) =>
    set((s) => {
      const items = s.notifications.items.map((it) => (it.id === id ? { ...it, read: true } : it));
      const unread = items.filter((it) => !it.read).length;
      return { notifications: { unread, items } };
    }),
  markNotificationsRead: () =>
    set((s) => ({
      notifications: {
        unread: 0,
        items: s.notifications.items.map((it) => ({ ...it, read: true })),
      },
    })),
  setTheme: (t) => set({ theme: t }),
  setTour: (patch) => set((s) => ({ tour: { ...s.tour, ...patch } })),
  setScenario: (scenario) => set({ scenario }),
  setOnboardingTask: (id, done) =>
    set((s) => ({ onboarding: { tasks: s.onboarding.tasks.map((t) => (t.id === id ? { ...t, done } : t)) } })),
  addTemplate: (t) => set((s) => ({ templates: [t, ...s.templates] })),
  removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
  addSavedView: (v) => set((s) => ({ savedViews: [v, ...s.savedViews] })),
  removeSavedView: (id) => set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) })),
  addNote: (interactionId, note) =>
    set((s) => ({ notes: { ...s.notes, [interactionId]: [note, ...(s.notes[interactionId] || [])] } })),
  setGoals: (g) => set((s) => ({ goals: { ...s.goals, ...g } })),
  setWhatIf: (w) => set((s) => ({ whatIf: { ...s.whatIf, ...w } })),
  setIntegrationStatus: (id, patch) =>
    set((s) => ({ integrations: s.integrations.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  setNotificationPrefs: (p) => set((s) => ({ notificationPrefs: { ...s.notificationPrefs, ...p } })),
  setBadgeRespectsMute: (v) => set({ badgeRespectsMute: v }),
  setDemoBannerDismissed: (v) => set({ demoBannerDismissed: v }),
    }),
    {
      name: 'revu-persist',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        templates: state.templates,
        savedViews: state.savedViews,
        onboarding: state.onboarding,
        tour: state.tour,
        filters: state.filters,
        goals: state.goals,
        whatIf: state.whatIf,
        integrations: state.integrations,
        scenario: state.scenario,
        notificationPrefs: state.notificationPrefs,
        badgeRespectsMute: state.badgeRespectsMute,
  demoBannerDismissed: state.demoBannerDismissed,
      }),
      version: 4,
    }
  )
);
