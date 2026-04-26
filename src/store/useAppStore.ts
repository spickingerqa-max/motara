import { create } from 'zustand';

export type ConnectionMode = 'solo' | 'ear' | 'speaker' | null;
export type MicState = 'idle' | 'listening' | 'translating' | 'error';
export type ProjectTab = 'chat' | 'ai';
export type ArchiveTab = 'conv' | 'proj';

export interface SavedRecord {
  type: 'conv' | 'proj';
  title: string;
  time: string;
  ts: number;
  messages: Array<{
    who: string;
    orig: string;
    trans: string;
  }>;
}

export interface Message {
  id: string;
  orig: string;
  trans: string;
  isMe: boolean;
  timestamp: number;
}

export interface ProjectMessage {
  id: string;
  who: string;
  whoType: 'kr' | 'en' | 'ai';
  text: string;
  timestamp: number;
}

interface AppState {
  // Navigation
  screen: 'home' | 'conv' | 'project' | 'archive';

  // Connection
  connectionMode: ConnectionMode;
  inviteCode: string | null;
  sessionRole: 'host' | 'participant' | null;
  participantCount: number;
  sessionConnected: boolean;

  // VAD / Mic
  micState: MicState;
  vadFailureCount: number;
  manualOverride: boolean;
  demoMode: boolean;

  // Conversation
  convMessages: Message[];

  // Project
  projectTab: ProjectTab;
  projectMessages: ProjectMessage[];

  // Archive
  archiveTab: ArchiveTab;
  savedRecords: SavedRecord[];

  // Actions
  setScreen: (screen: AppState['screen']) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setMicState: (state: MicState) => void;
  setManualOverride: (v: boolean) => void;
  setDemoMode: (v: boolean) => void;
  incrementVadFailure: () => void;
  resetVadFailure: () => void;
  setInviteCode: (code: string | null) => void;
  setSessionRole: (role: AppState['sessionRole']) => void;
  setParticipantCount: (n: number) => void;
  setSessionConnected: (v: boolean) => void;
  setProjectTab: (tab: ProjectTab) => void;
  setArchiveTab: (tab: ArchiveTab) => void;
  addConvMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => string; // returns id
  updateConvMessage: (id: string, patch: Partial<Pick<Message, 'trans' | 'orig'>>) => void;
  clearConvMessages: () => void;
  addProjectMessage: (msg: Omit<ProjectMessage, 'id' | 'timestamp'>) => void;
  addSavedRecord: (record: Omit<SavedRecord, 'ts'>) => void;
  resetSession: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  screen: 'home',
  connectionMode: null,
  inviteCode: null,
  sessionRole: null,
  participantCount: 1,
  sessionConnected: false,
  micState: 'idle',
  vadFailureCount: 0,
  manualOverride: false,
  demoMode: false,
  convMessages: [],
  projectTab: 'chat',
  projectMessages: [],
  archiveTab: 'conv',
  savedRecords: [],

  setScreen: (screen) => set({ screen }),
  setConnectionMode: (mode) => set({ connectionMode: mode }),
  setMicState: (state) => set({ micState: state }),
  setManualOverride: (v) => set({ manualOverride: v }),
  setDemoMode: (v) => set({ demoMode: v }),
  incrementVadFailure: () => set((s) => ({ vadFailureCount: s.vadFailureCount + 1 })),
  resetVadFailure: () => set({ vadFailureCount: 0 }),
  setInviteCode: (code) => set({ inviteCode: code }),
  setSessionRole: (role) => set({ sessionRole: role }),
  setParticipantCount: (n) => set({ participantCount: n }),
  setSessionConnected: (v) => set({ sessionConnected: v }),
  setProjectTab: (tab) => set({ projectTab: tab }),
  setArchiveTab: (tab) => set({ archiveTab: tab }),

  addConvMessage: (msg) => {
    const id = Date.now().toString();
    set((s) => ({
      convMessages: [
        ...s.convMessages,
        { ...msg, id, timestamp: Date.now() },
      ],
    }));
    return id;
  },

  updateConvMessage: (id, patch) =>
    set((s) => ({
      convMessages: s.convMessages.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    })),

  clearConvMessages: () => set({ convMessages: [] }),

  addProjectMessage: (msg) =>
    set((s) => ({
      projectMessages: [
        ...s.projectMessages,
        { ...msg, id: Date.now().toString(), timestamp: Date.now() },
      ],
    })),

  addSavedRecord: (record) =>
    set((s) => ({
      savedRecords: [
        ...s.savedRecords,
        { ...record, ts: Date.now() },
      ],
    })),

  resetSession: () =>
    set({
      connectionMode: null,
      inviteCode: null,
      sessionRole: null,
      participantCount: 1,
      sessionConnected: false,
      micState: 'idle',
      vadFailureCount: 0,
      manualOverride: false,
      convMessages: [],
      projectMessages: [],
      projectTab: 'chat',
    }),
}));
