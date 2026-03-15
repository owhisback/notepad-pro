const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  fullscreen: () => ipcRenderer.send('window-fullscreen'),

  // File operations
  openFile: () => ipcRenderer.invoke('file-open'),
  saveFile: (data) => ipcRenderer.invoke('file-save', data),
  saveFileAs: (data) => ipcRenderer.invoke('file-save-as', data),
  openFolder: () => ipcRenderer.invoke('folder-open'),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // Data store
  dataRead: (fileName) => ipcRenderer.invoke('data-read', fileName),
  dataWrite: (fileName, data) => ipcRenderer.invoke('data-write', { fileName, data }),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),

  // Attachments
  pickAttachments: () => ipcRenderer.invoke('pick-attachments'),
  openAttachment: (filePath) => ipcRenderer.invoke('open-attachment', filePath),
  deleteAttachment: (filePath) => ipcRenderer.invoke('delete-attachment', filePath),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Menu events
  onMenuEvent: (channel, callback) => {
    ipcRenderer.removeAllListeners(channel);
    ipcRenderer.on(channel, callback);
  },

  // Reminder checker
  onCheckReminders: (callback) => {
    ipcRenderer.removeAllListeners('check-reminders');
    ipcRenderer.on('check-reminders', callback);
  }
});
