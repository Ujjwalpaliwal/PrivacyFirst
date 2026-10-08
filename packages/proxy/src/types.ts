import { Finding } from '@privacyfirst/engine';

export type ProxyMode = 'SANITIZE' | 'PASSTHROUGH';

export interface ProxyLogEntry {
  id: string;
  timestamp: string; // HH:mm:ss
  isoTimestamp: string;
  route: string;
  caller: 'opencode' | 'claude' | 'codex' | 'generic';
  upstream: string;
  mode: ProxyMode;
  findingsCount: number;
  findings: Finding[];
  status: number;
  durationMs: number;
}

export interface ProxyOptions {
  port?: number;
  host?: string;
  mode?: ProxyMode;
  onLog?: (entry: ProxyLogEntry) => void;
  onModeChange?: (mode: ProxyMode) => void;
}
