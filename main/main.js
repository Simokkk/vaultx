'use strict';

/**
 * VaultX — Main process entry point.
 * Crea una BrowserWindow sicura, inizializza servizi, registra IPC,
 * gestisce system tray, shortcut globali, auto-lock su eventi OS.
 */

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  powerMonitor,
  nativeImage,
  shell,
  session,
  ipcMain
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const { registerAuthIpc } = require('./ipc/auth');
const { registerVaultIpc } = require('./ipc/vault');
const { registerGeneratorIpc } = require('./ipc/generator');
const { registerAutotypeIpc } = require('./ipc/autotype');
const { registerSettingsIpc } = require('./ipc/settings');
const { registerUpdateIpc } = require('./ipc/update');
const Updater = require('./services/updater');
const LockService = require('./services/lock');
const Database = require('./services/database');
const VaultService = require('./services/vault');
const SecurityUtils = require('./utils/security');
const ClipboardUtils = require('./utils/clipboard');

const isDev = process.env.NODE_ENV === 'development';
const allowDevTools = isDev || process.env.VAULTX_DEV_TOOLS === 'true';

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {Tray | null} */
let tray = null;
let isQuitting = false;

// Evita istanze multiple
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Hardening command line
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('disable-http-cache');

/** Directory user-data per DB e settings. */
function getUserDataPaths() {
  const userDir = app.getPath('userData');
  return {
    userDir,
    dbPath: path.join(userDir, 'vaultx.db')
  };
}

/** Crea la main window con configurazione sicura. */
function createMainWindow() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 860,
    minHeight: 600,
    backgroundColor: '#0d1117',
    show: true,
    center: true,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: allowDevTools
    }
  });

  // CSP stretta
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';" +
            " script-src 'self';" +
            " style-src 'self' 'unsafe-inline';" +
            " img-src 'self' data: https:;" +
            " font-src 'self' data:;" +
            " connect-src 'self';" +
            " object-src 'none';" +
            " base-uri 'self';" +
            " form-action 'none';" +
            " frame-ancestors 'none';"
        ]
      }
    });
  });

  // Blocca nuova finestra: apri nel browser di sistema se http/https
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  // Impedisce navigazione fuori dall'app
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });

  // Anti-debugging: chiusura DevTools forza lock
  mainWindow.webContents.on('devtools-opened', () => {
    if (!allowDevTools) {
      mainWindow?.webContents.closeDevTools();
      LockService.lock('devtools-detected');
    }
  });

  // Screenshot protection: feature disponibile nel codice ma disabilitata via UI
  // perché su alcuni compositori Windows rende la finestra invisibile.
  // setContentProtection non viene mai attivato all'avvio; toggle rimosso da UI e tray.

  const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    console.error('[VaultX] loadFile failed:', err);
  });

  const showOnce = (() => {
    let shown = false;
    return () => {
      if (shown || !mainWindow) return;
      shown = true;
      mainWindow.show();
      mainWindow.focus();
    };
  })();

  mainWindow.once('ready-to-show', showOnce);
  mainWindow.webContents.once('did-finish-load', showOnce);
  setTimeout(showOnce, 2500);

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[VaultX] did-fail-load', { code, desc, url });
    showOnce();
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[VaultX] render-process-gone', details);
  });
  mainWindow.webContents.on('preload-error', (_e, preloadPath, err) => {
    console.error('[VaultX] preload-error', preloadPath, err);
  });
  mainWindow.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) console.error(`[renderer] ${source}:${line} ${message}`);
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Lock quando finestra perde focus (opzionale, gestito via setting)
  mainWindow.on('blur', () => {
    LockService.onWindowBlur();
  });
}

/** Crea icona system tray con menu. */
function createTray() {
  const iconPath = path.join(__dirname, '..', 'build', 'tray.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('VaultX — Password Manager');
  rebuildTrayMenu();
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

/** Ricostruisce il menu tray. */
function rebuildTrayMenu() {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: 'Apri VaultX',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Blocca vault',
      click: () => LockService.lock('tray-menu')
    },
    { type: 'separator' },
    {
      label: 'Generatore password',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('ui:navigate', 'generator');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Esci',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(menu);
}

/** Registra shortcut globali. */
function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow) {
      mainWindow.webContents.send('ui:trigger-autotype');
    }
  });
}

/** Binding eventi OS per lock automatico. */
function wireOsLockSignals() {
  powerMonitor.on('lock-screen', () => LockService.lock('os-lock-screen'));
  powerMonitor.on('suspend', () => LockService.lock('os-suspend'));
  powerMonitor.on('shutdown', () => LockService.lock('os-shutdown'));
}

app.whenReady().then(async () => {
  try {
    const { dbPath } = getUserDataPaths();
    Database.init(dbPath);
    VaultService.init();
    ClipboardUtils.init((info) => {
      if (mainWindow) mainWindow.webContents.send('clipboard:cleared', info);
    });

    LockService.init({
      onLock: (reason) => {
        if (mainWindow) {
          mainWindow.webContents.send('session:locked', { reason });
        }
      }
    });

    registerAuthIpc(ipcMain, { getMainWindow: () => mainWindow });
    registerVaultIpc(ipcMain);
    registerGeneratorIpc(ipcMain);
    registerAutotypeIpc(ipcMain);
    registerSettingsIpc(ipcMain, {
      getMainWindow: () => mainWindow,
      setAutoStart: (enabled) => {
        app.setLoginItemSettings({ openAtLogin: !!enabled, path: process.execPath });
      },
      onProtectionChanged: () => rebuildTrayMenu()
    });
    registerUpdateIpc(ipcMain);
    Updater.init({ getMainWindow: () => mainWindow });

    // Window control IPC
    ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    ipcMain.handle('window:toggleMaximize', () => {
      if (!mainWindow) return;
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    });
    ipcMain.handle('window:close', () => mainWindow?.hide());
    ipcMain.handle('window:quit', () => {
      isQuitting = true;
      app.quit();
    });
    ipcMain.handle('shell:openExternal', (_e, url) => {
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        return shell.openExternal(url);
      }
      return Promise.reject(new Error('URL non valido'));
    });

    createMainWindow();
    createTray();
    registerGlobalShortcuts();
    wireOsLockSignals();

    // Controllo aggiornamenti silenzioso all'avvio (non blocca l'UI).
    // Se disponibile, il renderer mostra una notifica; il download resta manuale.
    setTimeout(() => {
      Updater.check().catch(() => {});
    }, 8000);
  } catch (err) {
    console.error('[VaultX] init failed:', err);
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  try {
    LockService.lock('app-quit');
    ClipboardUtils.clearNow();
    Database.close();
  } catch (_err) {
    /* swallow */
  }
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (_err) {
    /* swallow */
  }
});

app.on('window-all-closed', () => {
  // Mantieni app in tray su Windows
  if (process.platform !== 'win32') app.quit();
});

app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-attach-webview', (event) => event.preventDefault());
});
