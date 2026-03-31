/**
 * main.js — Electron ana süreci.
 * 1) Flask (Python) backend'ini subprocess olarak başlatır
 * 2) BrowserWindow oluşturur
 * 3) IPC handler'larını kaydeder
 */

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const settings = require('./settings');

// ─────────────────────────────────────────────
// Ortam tespiti
// ─────────────────────────────────────────────
const IS_PACKAGED = app.isPackaged;
const RESOURCES   = IS_PACKAGED ? process.resourcesPath : path.join(__dirname, '..');

// ─────────────────────────────────────────────
// Loglama — Paketlenmiş modda dosyaya yaz
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

// Python yolu: packaged → bundled Python, dev → sistem Python
const PYTHON_EXE = IS_PACKAGED
  ? path.join(RESOURCES, 'python', 'python.exe')
  : 'python';

// Backend script yolu
const BACKEND_SCRIPT = IS_PACKAGED
  ? path.join(RESOURCES, 'backend', 'app.py')
  : path.join(__dirname, '..', 'backend', 'app.py');

// FFmpeg yolu: packaged → bundled, dev → sistem PATH
const FFMPEG_DIR = IS_PACKAGED
  ? path.join(RESOURCES, 'ffmpeg')
  : null;

// Downloads klasörü: packaged → Kullanıcının İndirilenler klasörü, dev → proje/downloads
const defaultDownloads = IS_PACKAGED
  ? path.join(app.getPath('downloads'), 'YT Downloader')
  : path.join(__dirname, '..', 'downloads');
let DOWNLOADS_DIR = settings.get('downloadPath') || defaultDownloads;

// Frontend URL: app.getAppPath() her zaman dogru kok dizinini verir
const FRONTEND_URL = `file://${path.join(app.getAppPath(), 'frontend', 'dist', 'index.html')}`;

// ─────────────────────────────────────────────
// Globals
// ─────────────────────────────────────────────
let mainWindow   = null;
let flaskProcess = null;
let flaskReady   = false;

// ─────────────────────────────────────────────
// Flask backend başlatma
// ─────────────────────────────────────────────
function startFlask() {
  // Downloads klasörünü garanti et
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

  const env = {
    ...process.env,
    FLASK_ENV: 'production',
    PYTHONUNBUFFERED: '1',   // Python çıktısını anında al (buffer bekleme)
    YTDL_DOWNLOAD_FOLDER: DOWNLOADS_DIR,
  };

  // Bundled FFmpeg varsa PATH'e ekle
  if (FFMPEG_DIR && fs.existsSync(FFMPEG_DIR)) {
    env.PATH = `${FFMPEG_DIR}${path.delimiter}${env.PATH || ''}`;
  }

  // Dosya varlık kontrolleri
  const pythonExists = fs.existsSync(PYTHON_EXE);
  const scriptExists = fs.existsSync(BACKEND_SCRIPT);
  writeLog('INFO', 'Python path:', PYTHON_EXE, '| exists:', pythonExists);
  writeLog('INFO', 'Backend script:', BACKEND_SCRIPT, '| exists:', scriptExists);
  writeLog('INFO', 'FFmpeg dir:', FFMPEG_DIR || 'system PATH');
  writeLog('INFO', 'Downloads dir:', DOWNLOADS_DIR);
  writeLog('INFO', 'Frontend URL:', FRONTEND_URL);

  if (!pythonExists) {
    const msg = `Python bulunamadi: ${PYTHON_EXE}`;
    writeLog('ERROR', msg);
    dialog.showErrorBox('YT Downloader Hatasi', msg + '\n\nLutfen uygulamayi yeniden kurun.');
    return;
  }
  if (!scriptExists) {
    const msg = `Backend script bulunamadi: ${BACKEND_SCRIPT}`;
    writeLog('ERROR', msg);
    dialog.showErrorBox('YT Downloader Hatasi', msg);
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
    // Eger pencere açıkken Flask çökerse kullanıcıya bildir
    if (mainWindow && !flaskReady) {
      dialog.showErrorBox(
        'Backend Baslatilamadi',
        `Flask sunucusu baslatilirken hata olustu (code: ${code}).\n\nLog dosyasi: ${LOG_FILE || 'console'}\n\nLutfen uygulamayi yeniden baslatmayi deneyin.`
      );
    }
  });
}

// ─────────────────────────────────────────────
// Flask hazır olana kadar bekle (polling)
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
        // Flask henüz çöktü mü?
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
    setTimeout(check, 500); // İlk kontrolü biraz geciktir
  });
}

// ─────────────────────────────────────────────
// BrowserWindow oluştur
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

  // Sağ tık menüsü (Kopyala/Yapıştır/Kes)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const contextMenu = Menu.buildFromTemplate([
      { role: 'cut', label: 'Kes' },
      { role: 'copy', label: 'Kopyala' },
      { role: 'paste', label: 'Yapıştır' },
      { type: 'separator' },
      { role: 'selectAll', label: 'Tümünü Seç' }
    ]);
    contextMenu.popup(mainWindow);
  });

  // Dev tools: sadece geliştirme modunda
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
    // Flask'in GERCEKTEN ayaga kalkmasini bekle (max 20 saniye)
    await waitForFlask(40, 500);
    writeLog('INFO', 'Flask is ready, creating window...');
  } catch (err) {
    writeLog('ERROR', 'Flask startup failed:', err.message);
    dialog.showErrorBox(
      'Sunucu Baslatilamadi',
      `Flask backend baslatilirken hata olustu:\n${err.message}\n\nLog dosyasi: ${LOG_FILE || 'console'}\n\nUygulamayi yeniden baslatmayi deneyin.`
    );
    // Yine de pencereyi aç — kullanıcı log dosyasını görebilsin
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
