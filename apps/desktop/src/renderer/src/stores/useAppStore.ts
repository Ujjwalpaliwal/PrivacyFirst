import { create } from 'zustand';
import { ProxyLogEntry, ProxyMode } from '@privacyfirst/proxy';

export type TabType = 'checkpoint' | 'proxy' | 'rules' | 'settings';
export type SendMode = 'SANITIZED' | 'ORIGINAL';

interface AppState {
  activeTab: TabType;
  proxyMode: ProxyMode;
  proxyLogs: ProxyLogEntry[];
  allowList: string[];
  defaultSendMode: SendMode;
  memoryApiKeys: {
    openai?: string;
    anthropic?: string;
    gemini?: string;
    customEndpoint?: string;
  };

  setActiveTab: (tab: TabType) => void;
  setProxyMode: (mode: ProxyMode) => void;
  addProxyLog: (log: ProxyLogEntry) => void;
  clearProxyLogs: () => void;
  addAllowItem: (item: string) => void;
  removeAllowItem: (item: string) => void;
  setDefaultSendMode: (mode: SendMode) => void;
  setApiKey: (provider: 'openai' | 'anthropic' | 'gemini' | 'customEndpoint', key: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'checkpoint',
  proxyMode: 'SANITIZE',
  proxyLogs: [],
  allowList: [],
  defaultSendMode: 'SANITIZED',
  memoryApiKeys: {},

  setActiveTab: (activeTab) => set({ activeTab }),
  setProxyMode: (proxyMode) => set({ proxyMode }),
  addProxyLog: (log) => set((state) => ({ proxyLogs: [log, ...state.proxyLogs.slice(0, 199)] })),
  clearProxyLogs: () => set({ proxyLogs: [] }),
  addAllowItem: (item) =>
    set((state) => ({
      allowList: state.allowList.includes(item) ? state.allowList : [...state.allowList, item]
    })),
  removeAllowItem: (item) =>
    set((state) => ({
      allowList: state.allowList.filter((i) => i !== item)
    })),
  setDefaultSendMode: (defaultSendMode) => set({ defaultSendMode }),
  setApiKey: (provider, key) =>
    set((state) => ({
      memoryApiKeys: {
        ...state.memoryApiKeys,
        [provider]: key
      }
    }))
}));
