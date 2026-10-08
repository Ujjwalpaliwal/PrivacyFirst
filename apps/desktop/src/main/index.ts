import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { Vault, sanitize, restore } from '@privacyfirst/engine';
import { PrivacyFirstProxy, ProxyLogEntry, ProxyMode } from '@privacyfirst/proxy';
import { AutoProtectManager } from '@privacyfirst/connect';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let proxyServer: PrivacyFirstProxy | null = null;
const checkpointVault = new Vault();
const autoProtectManager = new AutoProtectManager('http://127.0.0.1:4040');

function createStatusTrayIcon(mode: ProxyMode): Electron.NativeImage {
  // 16x16 icon generation using data URL with green vs red dot
  const color = mode === 'SANITIZE' ? '#22c55e' : '#ef4444';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="6" fill="${color}" stroke="#0a0a0a" stroke-width="2"/>
  </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function updateTray(mode: ProxyMode) {
  if (!tray) return;
  tray.setImage(createStatusTrayIcon(mode));
  tray.setToolTip(`PrivacyFirst (${mode === 'SANITIZE' ? 'Protected' : 'RAW / Passthrough'})`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Mode: ${mode}`,
      enabled: false
    },
    {
      label: mode === 'SANITIZE' ? 'Switch to Passthrough (Raw)' : 'Switch to Sanitize (Protected)',
      click: () => {
        const nextMode: ProxyMode = mode === 'SANITIZE' ? 'PASSTHROUGH' : 'SANITIZE';
        proxyServer?.setMode(nextMode);
      }
    },
    { type: 'separator' },
    {
      label: 'Show PrivacyFirst',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.exit(0);
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0a',
      symbolColor: '#ededed',
      height: 38
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Global flag to allow explicit quit
declare global {
  namespace NodeJS {
    interface Process {
      isQuitting?: boolean;
    }
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.privacyfirst.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Start Proxy Server
  proxyServer = new PrivacyFirstProxy({
    port: 4040,
    host: '127.0.0.1',
    mode: 'SANITIZE',
    onLog: (log: ProxyLogEntry) => {
      mainWindow?.webContents.send('proxy:log', log);
    },
    onModeChange: (newMode: ProxyMode) => {
      updateTray(newMode);
    }
  });

  try {
    await proxyServer.start();
    console.log('PrivacyFirst Proxy running on 127.0.0.1:4040');
  } catch (err) {
    console.error('Failed to start proxy server:', err);
  }

  // Setup System Tray
  try {
    tray = new Tray(createStatusTrayIcon('SANITIZE'));
    updateTray('SANITIZE');
    tray.on('double-click', () => {
      mainWindow?.show();
    });
  } catch (err) {
    console.warn('Tray icon initialization skipped:', err);
  }

  // Register IPC Handlers
  ipcMain.handle('engine:sanitize', (_event, text: string, allowList?: string[]) => {
    const allowSet = allowList ? new Set(allowList) : undefined;
    return sanitize(text, checkpointVault, { allowList: allowSet });
  });

  ipcMain.handle('engine:restore', (_event, text: string) => {
    return restore(text, checkpointVault);
  });

  ipcMain.handle('engine:clearVault', () => {
    checkpointVault.clear();
  });

  ipcMain.handle('proxy:getMode', () => {
    return proxyServer?.getMode() || 'SANITIZE';
  });

  ipcMain.handle('proxy:setMode', (_event, mode: ProxyMode) => {
    proxyServer?.setMode(mode);
    updateTray(mode);
  });

  ipcMain.handle('connect:detectTools', () => {
    return autoProtectManager.detectTools();
  });

  ipcMain.handle('connect:preview', (_event, tools) => {
    return autoProtectManager.previewChanges(tools);
  });

  ipcMain.handle('connect:apply', (_event, tools) => {
    return autoProtectManager.applyAutoProtect(tools);
  });

  ipcMain.handle('connect:undo', () => {
    return autoProtectManager.undoLastBackup();
  });

  ipcMain.handle('connect:disconnect', () => {
    autoProtectManager.disconnectAll();
  });

  ipcMain.handle('app:minimizeToTray', () => {
    mainWindow?.hide();
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep alive in tray unless explicitly quit
  }
});
