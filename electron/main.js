/**
 * main.js — Electron main process.
 * 1) Spawns the Flask (Python) backend as a subprocess
 * 2) Creates the BrowserWindow
 * 3) Registers IPC handlers
 */

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const settings = require('./settings');

// ─────────────────────────────────────────────
// Environment detection
// ─────────────────────────────────────────────
const IS_PACKAGED = app.isPackaged;
const RESOURCES   = IS_PACKAGED ? process.resourcesPath : path.join(__dirname, '..');

// ─────────────────────────────────────────────
// Logging — write to file in packaged mode
// ─────────────────────────────────────────────
const LOG_FILE = IS_PACKAGED
  ? path.join(app.getPath('userData'), 'app.log')
  : null;

function writeLog(level, ...args) {
  const msg = `[${new Date().toISOString()}] [${level}] ${args.join(' ')}`;
  console.log(msg);
  if (LOG_FILE) {
    try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch (_) {}
  }
}

// Python path: packaged → bundled Python, dev → system Python
const PYTHON_EXE = IS_PACKAGED
  ? path.join(RESOURCES, 'python', 'python.exe')
  : 'python';

// Backend script path
const BACKEND_SCRIPT = IS_PACKAGED
  ? path.join(RESOURCES, 'backend', 'app.py')
  : path.join(__dirname, '..', 'backend', 'app.py');

// FFmpeg path: packaged → bundled, dev → system PATH
const FFMPEG_DIR = IS_PACKAGED
  ? path.join(RESOURCES, 'ffmpeg')
  : null;

// Downloads folder: packaged → user's Downloads/YT Downloader, dev → project/downloads
const defaultDownloads = IS_PACKAGED
  ? path.join(app.getPath('downloads'), 'YT Downloader')
  : path.join(__dirname, '..', 'downloads');
let DOWNLOADS_DIR = settings.get('downloadPath') || defaultDownloads;

// Frontend URL — app.getAppPath() always returns the correct root directory
const FRONTEND_URL = `file://${path.join(app.getAppPath(), 'frontend', 'dist', 'index.html')}`;

// ─────────────────────────────────────────────
// Globals
// ─────────────────────────────────────────────
let mainWindow   = null;
let flaskProcess = null;
let flaskReady   = false;

// ─────────────────────────────────────────────
// Start Flask backend
// ─────────────────────────────────────────────
function startFlask() {
  // Make sure the downloads folder exists
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

  const env = {
    ...process.env,
    FLASK_ENV: 'production',
    PYTHONUNBUFFERED: '1',   // stream Python output immediately (no buffering)
    YTDL_DOWNLOAD_FOLDER: DOWNLOADS_DIR,
  };

  // Prepend the bundled FFmpeg directory to PATH if it exists
  if (FFMPEG_DIR && fs.existsSync(FFMPEG_DIR)) {
    env.PATH = `${FFMPEG_DIR}${path.delimiter}${env.PATH || ''}`;
  }

  // Verify required files exist before spawning
  const pythonExists = fs.existsSync(PYTHON_EXE);
  const scriptExists = fs.existsSync(BACKEND_SCRIPT);
  writeLog('INFO', 'Python path:', PYTHON_EXE, '| exists:', pythonExists);
  writeLog('INFO', 'Backend script:', BACKEND_SCRIPT, '| exists:', scriptExists);
  writeLog('INFO', 'FFmpeg dir:', FFMPEG_DIR || 'system PATH');
  writeLog('INFO', 'Downloads dir:', DOWNLOADS_DIR);
  writeLog('INFO', 'Frontend URL:', FRONTEND_URL);

  if (!pythonExists) {
    const msg = `Python not found: ${PYTHON_EXE}`;
    writeLog('ERROR', msg);
    dialog.showErrorBox('YT Downloader Error', msg + '\n\nPlease reinstall the application.');
    return;
  }
  if (!scriptExists) {
    const msg = `Backend script not found: ${BACKEND_SCRIPT}`;
    writeLog('ERROR', msg);
    dialog.showErrorBox('YT Downloader Error', msg);
    return;
  }

  writeLog('INFO', 'Starting Flask...');

  flaskProcess = spawn(PYTHON_EXE, [BACKEND_SCRIPT], {
    env,
    cwd: IS_PACKAGED ? path.join(RESOURCES, 'backend') : path.join(__dirname, '..', 'backend'),
    windowsHide: true,
  });

  flaskProcess.stdout.on('data', (d) => {
    const text = d.toString().trim();
    writeLog('FLASK', text);
  });
  flaskProcess.stderr.on('data', (d) => {
    const text = d.toString().trim();
    writeLog('FLASK-ERR', text);
  });
  flaskProcess.on('error', (err) => {
    writeLog('ERROR', 'Flask process spawn error:', err.message);
  });
  flaskProcess.on('exit', (code, signal) => {
    writeLog('INFO', 'Flask exited | code:', code, '| signal:', signal);
    flaskProcess = null;
    // Notify the user if Flask crashes while the window is still open
    if (mainWindow && !flaskReady) {
      dialog.showErrorBox(
        'Backend Failed to Start',
        `The Flask server crashed during startup (code: ${code}).\n\nLog file: ${LOG_FILE || 'console'}\n\nPlease try restarting the application.`
      );
    }
  });
}

// ─────────────────────────────────────────────
// Poll until Flask is ready to accept requests
// ─────────────────────────────────────────────
function waitForFlask(retries = 40, delay = 500) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    let attempts = 0;

    const check = () => {
      attempts++;
      writeLog('INFO', `Flask health check attempt ${attempts}/${retries}...`);
      
      const req = http.get('http://127.0.0.1:5000/api/info?url=ping', (res) => {
        writeLog('INFO', 'Flask is ready! (status:', res.statusCode, ')');
        flaskReady = true;
        resolve();
      });
      req.on('error', () => {
        // Has Flask already crashed?
        if (!flaskProcess) {
          reject(new Error('Flask process crashed before becoming ready'));
          return;
        }
        if (attempts >= retries) {
          reject(new Error(`Flask did not respond after ${retries} attempts (${retries * delay / 1000}s)`));
        } else {
          setTimeout(check, delay);
        }
      });
      req.setTimeout(2000, () => { req.destroy(); });
      req.end();
    };
    setTimeout(check, 500); // slight delay before the first check
  });
}

// ─────────────────────────────────────────────
// Create the main BrowserWindow
// ─────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1100,
    height:          750,
    minWidth:        800,
    minHeight:       600,
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload:            path.join(__dirname, 'preload.js'),
      contextIsolation:   true,
      nodeIntegration:    false,
      webSecurity:        true,
    },
    titleBarStyle: 'default',
    icon: IS_PACKAGED
      ? path.join(RESOURCES, '..', 'frontend', 'src', 'assets', 'logo.png')
      : path.join(__dirname, '..', 'frontend', 'src', 'assets', 'logo.png'),
  });

  mainWindow.loadURL(FRONTEND_URL);

  // Right-click context menu (Cut / Copy / Paste / Select All)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const contextMenu = Menu.buildFromTemplate([
      { role: 'cut',       label: 'Cut' },
      { role: 'copy',      label: 'Copy' },
      { role: 'paste',     label: 'Paste' },
      { type: 'separator' },
      { role: 'selectAll', label: 'Select All' }
    ]);
    contextMenu.popup(mainWindow);
  });

  // Open DevTools in development mode only
  if (!IS_PACKAGED) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────
ipcMain.handle('open-downloads-folder', () => {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  shell.openPath(DOWNLOADS_DIR);
});
ipcMain.handle('get-download-path', () => DOWNLOADS_DIR);
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

ipcMain.handle('change-download-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = result.filePaths[0];
    DOWNLOADS_DIR = newPath;
    settings.set('downloadPath', newPath);
    
    const http = require('http');
    const req = http.request('http://127.0.0.1:5000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    req.write(JSON.stringify({ downloadFolder: newPath }));
    req.end();

    return newPath;
  }
  return null;
});

ipcMain.handle('get-settings',    ()     => settings.getSettings());
ipcMain.handle('save-settings',   (_, d) => settings.saveSettings(d));
ipcMain.handle('get-version',     ()     => app.getVersion());

// ─────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────
app.whenReady().then(async () => {
  writeLog('INFO', '=== YT Downloader starting ===');
  writeLog('INFO', 'Packaged:', IS_PACKAGED);
  writeLog('INFO', 'Resources:', RESOURCES);
  writeLog('INFO', 'App path:', app.getAppPath());

  startFlask();

  try {
    // Wait for Flask to actually be ready (max 20 seconds)
    await waitForFlask(40, 500);
    writeLog('INFO', 'Flask is ready, creating window...');
  } catch (err) {
    writeLog('ERROR', 'Flask startup failed:', err.message);
    dialog.showErrorBox(
      'Backend Failed to Start',
      `Flask backend failed to start:\n${err.message}\n\nLog file: ${LOG_FILE || 'console'}\n\nPlease try restarting the application.`
    );
    // Open the window anyway so the user can inspect the log file
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (flaskProcess) {
    try { flaskProcess.kill('SIGTERM'); } catch (_) {}
    flaskProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (flaskProcess) {
    try { flaskProcess.kill('SIGTERM'); } catch (_) {}
  }
});
