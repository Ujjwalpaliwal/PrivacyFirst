import { contextBridge, ipcRenderer } from 'electron';
import { Finding, SanitizeResult } from '@privacyfirst/engine';
import { ProxyLogEntry, ProxyMode } from '@privacyfirst/proxy';
import { BackupMetadata, ConfigPreview, SupportedTool, ToolDetectionResult } from '@privacyfirst/connect';

export interface PrivacyFirstAPI {
  // Engine Mode A (Chat Checkpoint)
  sanitize: (text: string, allowList?: string[]) => Promise<SanitizeResult>;
  restore: (text: string) => Promise<string>;
  clearVault: () => Promise<void>;

  // Proxy Control & Logs (Mode B)
  getProxyMode: () => Promise<ProxyMode>;
  setProxyMode: (mode: ProxyMode) => Promise<void>;
  onProxyLog: (callback: (log: ProxyLogEntry) => void) => () => void;

  // Auto-protect (Block 4b)
  detectTools: () => Promise<ToolDetectionResult[]>;
  previewAutoProtect: (tools: SupportedTool[]) => Promise<ConfigPreview[]>;
  applyAutoProtect: (tools: SupportedTool[]) => Promise<BackupMetadata>;
  undoAutoProtect: () => Promise<boolean>;
  disconnectAutoProtect: () => Promise<void>;

  // App Controls
  minimizeToTray: () => Promise<void>;
}

const api: PrivacyFirstAPI = {
  sanitize: (text, allowList) => ipcRenderer.invoke('engine:sanitize', text, allowList),
  restore: (text) => ipcRenderer.invoke('engine:restore', text),
  clearVault: () => ipcRenderer.invoke('engine:clearVault'),

  getProxyMode: () => ipcRenderer.invoke('proxy:getMode'),
  setProxyMode: (mode) => ipcRenderer.invoke('proxy:setMode', mode),
  onProxyLog: (callback) => {
    const handler = (_event: any, log: ProxyLogEntry) => callback(log);
    ipcRenderer.on('proxy:log', handler);
    return () => {
      ipcRenderer.removeListener('proxy:log', handler);
    };
  },

  detectTools: () => ipcRenderer.invoke('connect:detectTools'),
  previewAutoProtect: (tools) => ipcRenderer.invoke('connect:preview', tools),
  applyAutoProtect: (tools) => ipcRenderer.invoke('connect:apply', tools),
  undoAutoProtect: () => ipcRenderer.invoke('connect:undo'),
  disconnectAutoProtect: () => ipcRenderer.invoke('connect:disconnect'),

  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray')
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('privacyFirst', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore
  window.privacyFirst = api;
}
