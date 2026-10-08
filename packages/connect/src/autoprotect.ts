import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { BackupMetadata, ConfigPreview, SupportedTool, ToolDetectionResult } from './types.js';

export class AutoProtectManager {
  private baseProxyUrl: string;

  constructor(proxyUrl: string = 'http://127.0.0.1:4040') {
    this.baseProxyUrl = proxyUrl;
  }

  public getBackupsRoot(): string {
    return path.join(os.homedir(), '.privacyfirst', 'backups');
  }

  public getToolConfigPath(tool: SupportedTool): string {
    const home = os.homedir();
    switch (tool) {
      case 'opencode':
        return path.resolve(process.cwd(), 'opencode.json');
      case 'claude':
        return path.join(home, '.claude', 'settings.json');
      case 'codex':
        return path.join(home, '.codex', 'config.toml');
    }
  }

  public detectTools(): ToolDetectionResult[] {
    const tools: { tool: SupportedTool; displayName: string; targetKey: string }[] = [
      { tool: 'opencode', displayName: 'opencode', targetKey: 'provider.baseUrl' },
      { tool: 'claude', displayName: 'Claude Code', targetKey: 'apiBaseUrl' },
      { tool: 'codex', displayName: 'Codex', targetKey: 'api_base' }
    ];

    return tools.map(({ tool, displayName, targetKey }) => {
      const configPath = this.getToolConfigPath(tool);
      const parentDir = path.dirname(configPath);
      const isInstalled = fs.existsSync(configPath) || fs.existsSync(parentDir);

      let isConfigured = false;
      let currentValue: string | undefined;

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        if (tool === 'codex') {
          const match = content.match(/api_base\s*=\s*["']([^"']+)["']/);
          if (match) {
            currentValue = match[1];
            isConfigured = currentValue.includes('127.0.0.1:4040');
          }
        } else {
          try {
            const parsed = JSON.parse(content);
            if (tool === 'claude') {
              currentValue = parsed.apiBaseUrl;
              isConfigured = currentValue === this.baseProxyUrl;
            } else if (tool === 'opencode') {
              currentValue = parsed['provider.baseUrl'];
              isConfigured = currentValue === this.baseProxyUrl;
            }
          } catch {
            // Ignore malformed JSON for status check
          }
        }
      }

      return {
        tool,
        displayName,
        configPath,
        isInstalled,
        isConfigured,
        currentValue,
        targetKey,
        targetValue: this.baseProxyUrl
      };
    });
  }

  public previewChanges(tools: SupportedTool[]): ConfigPreview[] {
    return tools.map((tool) => {
      const configPath = this.getToolConfigPath(tool);
      const originalContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '';
      const proposedContent = this.generateUpdatedConfig(tool, originalContent);

      return {
        tool,
        configPath,
        originalContent,
        proposedContent,
        diffSummary: `Set ${tool} endpoint to ${this.baseProxyUrl}`
      };
    });
  }

  public applyAutoProtect(tools: SupportedTool[]): BackupMetadata {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.getBackupsRoot(), timestamp);
    fs.mkdirSync(backupDir, { recursive: true });

    for (const tool of tools) {
      const configPath = this.getToolConfigPath(tool);
      const parentDir = path.dirname(configPath);

      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      const originalContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '';

      // Create backup of existing file
      if (originalContent) {
        const backupFile = path.join(backupDir, `${tool}-${path.basename(configPath)}`);
        fs.writeFileSync(backupFile, originalContent, 'utf-8');
      }

      // Merge and write updated config
      const updatedContent = this.generateUpdatedConfig(tool, originalContent);
      fs.writeFileSync(configPath, updatedContent, 'utf-8');
    }

    const metadata: BackupMetadata = {
      id: timestamp,
      timestamp,
      tools,
      backupDir
    };

    fs.writeFileSync(
      path.join(backupDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    return metadata;
  }

  public undoLastBackup(): boolean {
    const root = this.getBackupsRoot();
    if (!fs.existsSync(root)) return false;

    const dirs = fs
      .readdirSync(root)
      .filter((d) => fs.statSync(path.join(root, d)).isDirectory())
      .sort()
      .reverse();

    if (dirs.length === 0) return false;

    const latestBackupDir = path.join(root, dirs[0]);
    const metaPath = path.join(latestBackupDir, 'metadata.json');

    if (fs.existsSync(metaPath)) {
      const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      for (const tool of metadata.tools) {
        const configPath = this.getToolConfigPath(tool);
        const backupFile = path.join(latestBackupDir, `${tool}-${path.basename(configPath)}`);

        if (fs.existsSync(backupFile)) {
          const content = fs.readFileSync(backupFile, 'utf-8');
          fs.writeFileSync(configPath, content, 'utf-8');
        } else if (fs.existsSync(configPath)) {
          // If it didn't exist before, remove the created one
          fs.unlinkSync(configPath);
        }
      }
      return true;
    }
    return false;
  }

  public disconnectAll(tools: SupportedTool[] = ['opencode', 'claude', 'codex']): void {
    for (const tool of tools) {
      const configPath = this.getToolConfigPath(tool);
      if (!fs.existsSync(configPath)) continue;

      const content = fs.readFileSync(configPath, 'utf-8');
      if (tool === 'codex') {
        const cleaned = content.replace(/api_base\s*=\s*["'][^"']+["']\n?/g, '');
        fs.writeFileSync(configPath, cleaned, 'utf-8');
      } else {
        try {
          const parsed = JSON.parse(content);
          if (tool === 'claude') delete parsed.apiBaseUrl;
          if (tool === 'opencode') delete parsed['provider.baseUrl'];
          fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {
          // If unparseable, leave alone
        }
      }
    }
  }

  private generateUpdatedConfig(tool: SupportedTool, originalContent: string): string {
    if (tool === 'codex') {
      if (!originalContent) {
        return `api_base = "${this.baseProxyUrl}"\n`;
      }
      if (/api_base\s*=/i.test(originalContent)) {
        return originalContent.replace(/api_base\s*=\s*["'][^"']+["']/, `api_base = "${this.baseProxyUrl}"`);
      }
      return `${originalContent.trimEnd()}\napi_base = "${this.baseProxyUrl}"\n`;
    }

    // JSON-based config (opencode, claude)
    let parsed: Record<string, any> = {};
    if (originalContent.trim()) {
      try {
        parsed = JSON.parse(originalContent);
      } catch {
        parsed = {};
      }
    }

    if (tool === 'claude') {
      parsed.apiBaseUrl = this.baseProxyUrl;
    } else if (tool === 'opencode') {
      parsed['provider.baseUrl'] = this.baseProxyUrl;
    }

    return JSON.stringify(parsed, null, 2);
  }
}
