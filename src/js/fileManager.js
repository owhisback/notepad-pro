/* ═══════════════════════════════════════════════════ 
   FILE MANAGER — File operations
   ═══════════════════════════════════════════════════ */

class FileManager {
  constructor() {
    this.autosaveInterval = null;
  }

  init(settings) {
    if (settings.autosave) {
      this.startAutosave();
    }

    // Drag and drop support
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (files?.length) {
        for (const file of files) {
          await this.openFilePath(file.path);
        }
      }
    });
  }

  async newFile() {
    window.tabManager.createTab();
    window.editorManager.focus();
  }

  async openFile() {
    const result = await window.api.openFile();
    if (!result) return;
    if (result.error) { showToast(result.error, 'error'); return; }

    // Check if already open
    const existing = window.tabManager.getTabByFilePath(result.filePath);
    if (existing) {
      window.tabManager.activateTab(existing.id);
      return;
    }

    const fileName = result.filePath.split(/[/\\]/).pop();
    const tabId = window.tabManager.createTab(fileName, result.filePath, result.content);
    window.tabManager.markSaved(tabId);
    
    await this.addToRecent(result.filePath);
    showToast(window.i18n.t('file_opened'), 'success');
  }

  async openFilePath(filePath) {
    // Check if already open
    const existing = window.tabManager.getTabByFilePath(filePath);
    if (existing) {
      window.tabManager.activateTab(existing.id);
      return;
    }

    const result = await window.api.readFile(filePath);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    const fileName = filePath.split(/[/\\]/).pop();
    const tabId = window.tabManager.createTab(fileName, filePath, result.content);
    window.tabManager.markSaved(tabId);
    await this.addToRecent(filePath);
  }

  async save() {
    const tab = window.tabManager.getActiveTab();
    if (!tab) return;

    if (!tab.filePath) {
      return await this.saveAs();
    }

    const content = window.editorManager.getContent(tab.id);
    const result = await window.api.saveFile({ filePath: tab.filePath, content });
    
    if (result.success) {
      window.tabManager.markSaved(tab.id);
      showToast(window.i18n.t('file_saved'), 'success');
    } else {
      showToast(result.error, 'error');
    }
  }

  async saveAs() {
    const tab = window.tabManager.getActiveTab();
    if (!tab) return;

    const content = window.editorManager.getContent(tab.id);
    const result = await window.api.saveFileAs({ content, defaultPath: tab.filePath || 'untitled.txt' });
    
    if (result) {
      const fileName = result.filePath.split(/[/\\]/).pop();
      const lang = window.editorManager.detectLanguage(result.filePath);
      window.editorManager.setLanguage(tab.id, lang);
      window.tabManager.updateTitle(tab.id, fileName, result.filePath);
      window.tabManager.markSaved(tab.id);
      await this.addToRecent(result.filePath);
      showToast(window.i18n.t('file_saved'), 'success');
    }
  }

  async addToRecent(filePath) {
    let recent = await window.dataStore.getRecentFiles();
    recent = recent.filter(f => f !== filePath);
    recent.unshift(filePath);
    if (recent.length > 20) recent = recent.slice(0, 20);
    await window.dataStore.saveRecentFiles(recent);
  }

  startAutosave() {
    this.autosaveInterval = setInterval(async () => {
      const tab = window.tabManager.getActiveTab();
      if (tab?.filePath && tab.modified) {
        const content = window.editorManager.getContent(tab.id);
        await window.api.saveFile({ filePath: tab.filePath, content });
        window.tabManager.markSaved(tab.id);
      }
    }, 30000); // Every 30 seconds
  }

  stopAutosave() {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
    }
  }
}

// Toast helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

window.fileManager = new FileManager();
window.showToast = showToast;

// XSS escape helper (BUG 6)
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
window.escapeHtml = escapeHtml;

// Custom confirm dialog — replaces native confirm() with app-styled modal
function showConfirm(message, itemName = null) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-container');
    const prevMax = modal.style.maxWidth;
    modal.style.maxWidth = '360px';

    modal.innerHTML = `
      <div class="confirm-dialog-body">
        <div class="confirm-dialog-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </div>
        ${itemName ? `<div class="confirm-dialog-name">${escapeHtml(itemName)}</div>` : ''}
        <p class="confirm-dialog-message">${message}</p>
        <div class="confirm-dialog-actions">
          <button class="btn-secondary" id="confirm-cancel-btn">İptal</button>
          <button class="btn-danger" id="confirm-ok-btn">Sil</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');

    const close = (result) => {
      overlay.classList.add('hidden');
      modal.style.maxWidth = prevMax;
      resolve(result);
    };

    document.getElementById('confirm-cancel-btn').addEventListener('click', () => close(false));
    document.getElementById('confirm-ok-btn').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); }, { once: true });
  });
}
window.showConfirm = showConfirm;
