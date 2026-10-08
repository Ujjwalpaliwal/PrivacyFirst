export type SupportedTool = 'opencode' | 'claude' | 'codex';

export interface ToolDetectionResult {
  tool: SupportedTool;
  displayName: string;
  configPath: string;
  isInstalled: boolean;
  isConfigured: boolean;
  currentValue?: string;
  targetKey: string;
  targetValue: string;
}

export interface ConfigPreview {
  tool: SupportedTool;
  configPath: string;
  originalContent: string;
  proposedContent: string;
  diffSummary: string;
}

export interface BackupMetadata {
  id: string;
  timestamp: string;
  tools: SupportedTool[];
  backupDir: string;
}
