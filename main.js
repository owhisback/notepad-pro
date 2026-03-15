const { app, BrowserWindow, ipcMain, dialog, Menu, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const DATA_DIR = path.join(app.getPath('userData'), 'notepad-pro-data');

const ATTACHMENTS_DIR = path.join(DATA_DIR, 'attachments');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'src', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Open DevTools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Enable Ctrl+R / F5 to reload
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.key === 'r') || input.key === 'F5') {
      mainWindow.reload();
      event.preventDefault();
    }
  });
}

// ── App Lifecycle ──
app.whenReady().then(() => {
  ensureDataDir();
  createWindow();
  setupIPC();
  setupMenu();
  startReminderChecker();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ──
function setupIPC() {
  // Window controls
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window-close', () => mainWindow.close());
  ipcMain.on('window-fullscreen', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  // File operations
  ipcMain.handle('file-open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'css', 'html', 'py', 'xml', 'csv'] }
      ]
    });
    if (result.canceled) return null;
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
  });

  ipcMain.handle('file-save', async (event, { filePath, content }) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file-save-as', async (event, { content, defaultPath }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath || 'untitled.txt',
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (result.canceled) return null;
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { filePath: result.filePath };
  });

  ipcMain.handle('folder-open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return readDirRecursive(result.filePaths[0]);
  });

  ipcMain.handle('read-dir', async (event, dirPath) => {
    return readDirRecursive(dirPath);
  });

  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { content, filePath };
    } catch (err) {
      return { error: err.message };
    }
  });

  // Data store operations
  ipcMain.handle('data-read', async (event, fileName) => {
    const filePath = path.join(DATA_DIR, fileName);
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
      return null;
    } catch (err) {
      return null;
    }
  });

  ipcMain.handle('data-write', async (event, { fileName, data }) => {
    const filePath = path.join(DATA_DIR, fileName);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Attachments
  ipcMain.handle('pick-attachments', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'] }
      ]
    });
    if (result.canceled) return [];
    
    const attached = [];
    for (const srcPath of result.filePaths) {
      const fileName = path.basename(srcPath);
      const id = Date.now().toString(36) + '_' + fileName;
      const destPath = path.join(ATTACHMENTS_DIR, id);
      fs.copyFileSync(srcPath, destPath);
      const stats = fs.statSync(destPath);
      attached.push({
        id,
        name: fileName,
        path: destPath,
        size: stats.size,
        addedAt: new Date().toISOString()
      });
    }
    return attached;
  });

  ipcMain.handle('open-attachment', async (event, filePath) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-attachment', async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Notification
  ipcMain.on('show-notification', (event, { title, body }) => {
    new Notification({ title, body }).show();
  });

  // Shell
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });

  // Get data path
  ipcMain.handle('get-data-path', () => DATA_DIR);
}

// ── Directory Reader ──
function readDirRecursive(dirPath, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(entry => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          return {
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children: readDirRecursive(fullPath, maxDepth, currentDepth + 1)
          };
        }
        return { name: entry.name, path: fullPath, type: 'file' };
      })
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
  } catch (err) {
    return [];
  }
}

// ── Menu ──
function setupMenu() {
  const template = [
    {
      label: 'Dosya',
      submenu: [
        { label: 'Yeni', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new-file') },
        { label: 'Aç...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open-file') },
        { type: 'separator' },
        { label: 'Kaydet', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
        { label: 'Farklı Kaydet...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu-save-as') },
        { type: 'separator' },
        { label: 'Klasör Aç...', click: () => mainWindow.webContents.send('menu-open-folder') },
        { type: 'separator' },
        { label: 'Çıkış', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Düzen',
      submenu: [
        { role: 'undo', label: 'Geri Al' },
        { role: 'redo', label: 'Yinele' },
        { type: 'separator' },
        { role: 'cut', label: 'Kes' },
        { role: 'copy', label: 'Kopyala' },
        { role: 'paste', label: 'Yapıştır' },
        { type: 'separator' },
        { label: 'Bul', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu-find') },
        { label: 'Bul & Değiştir', accelerator: 'CmdOrCtrl+H', click: () => mainWindow.webContents.send('menu-replace') }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Tema Değiştir', accelerator: 'CmdOrCtrl+Shift+T', click: () => mainWindow.webContents.send('menu-toggle-theme') },
        { type: 'separator' },
        { label: 'Tam Ekran', accelerator: 'F11', click: () => mainWindow.webContents.send('menu-fullscreen') },
        { type: 'separator' },
        { label: 'Yakınlaştır', accelerator: 'CmdOrCtrl+=', click: () => mainWindow.webContents.send('menu-zoom-in') },
        { label: 'Uzaklaştır', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.send('menu-zoom-out') },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Geliştirici Araçları' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Reminder Checker ──
let reminderInterval;
function startReminderChecker() {
  reminderInterval = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('check-reminders');
    }
  }, 30000); // Check every 30 seconds
}
