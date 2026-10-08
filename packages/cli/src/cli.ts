#!/usr/bin/env node
import * as p from '@clack/prompts';
import color from 'picocolors';
import { AutoProtectManager, SupportedTool } from '@privacyfirst/connect';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'wizard';
  const manager = new AutoProtectManager();

  if (command === 'status') {
    const tools = manager.detectTools();
    console.log(color.bold('\n PrivacyFirst — Auto-Protect Status\n'));
    for (const t of tools) {
      const statusIcon = t.isConfigured
        ? color.green('● PROTECTED')
        : t.isInstalled
          ? color.yellow('○ DETECTED (NOT ROUTED)')
          : color.dim('✕ NOT FOUND');
      console.log(`  ${color.bold(t.displayName.padEnd(14))} ${statusIcon}`);
      console.log(`  ${color.dim('Config:')} ${t.configPath}`);
      if (t.currentValue) {
        console.log(`  ${color.dim('Endpoint:')} ${t.currentValue}`);
      }
      console.log('');
    }
    return;
  }

  if (command === 'off') {
    p.intro(color.bgYellow(color.black(' PrivacyFirst — Disconnect ')));
    manager.disconnectAll();
    p.outro(color.green('All tools disconnected from local proxy.'));
    return;
  }

  if (command === 'undo') {
    p.intro(color.bgCyan(color.black(' PrivacyFirst — Undo Config ')));
    const restored = manager.undoLastBackup();
    if (restored) {
      p.outro(color.green('Previous configuration restored from backup.'));
    } else {
      p.outro(color.red('No previous backup found to restore.'));
    }
    return;
  }

  // Interactive Wizard
  p.intro(color.bgYellow(color.black(' PrivacyFirst (prifir) ')));

  const detected = manager.detectTools();
  const available = detected.filter((d) => d.isInstalled);

  if (available.length === 0) {
    p.note('No supported tools (opencode, Claude Code, Codex) detected on standard paths.', 'Notice');
    p.outro(color.dim('You can manually point your AI tool baseUrl to http://127.0.0.1:4040'));
    return;
  }

  const selectedTools = (await p.multiselect({
    message: 'Select tools to auto-protect through 127.0.0.1:4040:',
    options: available.map((t) => ({
      value: t.tool,
      label: `${t.displayName} (${t.isConfigured ? 'Currently Protected' : 'Not Routed'})`,
      hint: t.configPath
    })),
    required: false
  })) as SupportedTool[];

  if (p.isCancel(selectedTools) || selectedTools.length === 0) {
    p.cancel('Setup cancelled.');
    return;
  }

  // Preview Changes
  const previews = manager.previewChanges(selectedTools);
  for (const prev of previews) {
    p.note(
      `${color.dim('Target:')} ${prev.configPath}\n\n${color.cyan(prev.proposedContent)}`,
      `Preview: ${prev.tool}`
    );
  }

  const confirm = await p.confirm({
    message: 'Apply these configuration changes with an automatic backup?'
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel('Changes aborted.');
    return;
  }

  const s = p.spinner();
  s.start('Writing configuration and creating backup...');
  const metadata = manager.applyAutoProtect(selectedTools);
  s.stop(color.green('Configuration applied successfully!'));

  p.note(
    `Backup saved to: ${metadata.backupDir}\nRun ${color.yellow('prifir undo')} anytime to restore previous settings.`,
    'Safety Net'
  );

  p.outro(color.yellow('PrivacyFirst is now active for your selected tools.'));
}

main().catch((err) => {
  console.error(color.red('Error:'), err);
  process.exit(1);
});
