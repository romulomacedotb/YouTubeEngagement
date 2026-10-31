import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { fork, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const isDev = !app.isPackaged;
const PORT = process.env.PORT || '3000';
const HEALTH_URL = `http://localhost:${PORT}/api/health`;

/**
 * Checks if the NestJS backend is responding to health requests
 */
function checkHealth(url: string, retries = 50, delayMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    let attempt = 0;

    const probe = () => {
      attempt++;
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (attempt < retries) {
          setTimeout(probe, delayMs);
        } else {
          resolve(false);
        }
      });

      req.on('error', () => {
        if (attempt < retries) {
          setTimeout(probe, delayMs);
        } else {
          resolve(false);
        }
      });

      req.setTimeout(1500, () => {
        req.destroy();
        if (attempt < retries) {
          setTimeout(probe, delayMs);
        } else {
          resolve(false);
        }
      });
    };

    probe();
  });
}

/**
 * Starts the NestJS backend process
 */
function startBackend() {
  if (isDev) {
    // In dev mode, assume either dev:all is running or start api dist if available
    const devApiPath = path.resolve(__dirname, '../../api/dist/main.js');
    if (fs.existsSync(devApiPath)) {
      backendProcess = fork(devApiPath, [], {
        env: {
          ...process.env,
          PORT,
          WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://localhost:5173',
        },
      });
    }
    return;
  }

  // Packaged Mode: Ensure SQLite database is in user's writable AppData directory
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const appPath = app.getAppPath();
  const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');

  const dbPath = path.join(userDataPath, 'youtube_engagement.db');
  let bundledDbPath = path.join(unpackedPath, 'prisma', 'dev.db');
  if (!fs.existsSync(bundledDbPath)) {
    bundledDbPath = path.join(appPath, 'prisma', 'dev.db');
  }

  if (!fs.existsSync(dbPath) && fs.existsSync(bundledDbPath)) {
    try {
      fs.copyFileSync(bundledDbPath, dbPath);
    } catch (copyErr) {
      console.error('Falha ao inicializar banco de dados padrão:', copyErr);
    }
  }

  const staticPath = path.join(appPath, 'web-dist');
  let apiPath = path.join(unpackedPath, 'api-dist', 'main.js');
  if (!fs.existsSync(apiPath)) {
    apiPath = path.join(appPath, 'api-dist', 'main.js');
  }

  const backendEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    PORT,
    WEB_ORIGIN: `http://localhost:${PORT}`,
    DATABASE_URL: `file:${dbPath}`,
    STATIC_PATH: staticPath,
  };

  backendProcess = fork(apiPath, [], {
    env: backendEnv,
    stdio: 'ignore',
  });

  backendProcess.on('error', (err) => {
    console.error('Erro no processo de backend NestJS:', err);
  });
}

/**
 * Creates the primary application window
 */
function createMainWindow(targetUrl: string) {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1040,
    minHeight: 700,
    title: 'YouTube Engagement Studio',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Handle OAuth and external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open Google Login and YouTube external links in default OS browser
    if (
      url.includes('accounts.google.com') ||
      url.includes('youtube.com') ||
      url.includes('youtu.be') ||
      !url.includes('localhost')
    ) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (
      url.includes('accounts.google.com') ||
      url.includes('youtube.com') ||
      url.includes('youtu.be')
    ) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(targetUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron Application Lifecycle
app.whenReady().then(async () => {
  startBackend();

  // Wait for the backend to be healthy
  await checkHealth(HEALTH_URL);

  const startUrl = isDev
    ? (process.env.DEV_URL || 'http://localhost:5173')
    : `http://localhost:${PORT}`;

  createMainWindow(startUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(startUrl);
    }
  });
});

app.on('before-quit', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch {}
    backendProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

