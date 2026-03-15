/* ═══════════════════════════════════════════════════ 
   SHORTCUTS — Keyboard shortcuts
   ═══════════════════════════════════════════════════ */

class ShortcutManager {
  init() {
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Ctrl+N — New file
      if (ctrl && !shift && e.key === 'n') {
        e.preventDefault();
        window.fileManager.newFile();
      }
      // Ctrl+O — Open file
      if (ctrl && !shift && e.key === 'o') {
        e.preventDefault();
        window.fileManager.openFile();
      }
      // Ctrl+S — Save
      if (ctrl && !shift && e.key === 's') {
        e.preventDefault();
        window.fileManager.save();
      }
      // Ctrl+Shift+S — Save As
      if (ctrl && shift && e.key === 'S') {
        e.preventDefault();
        window.fileManager.saveAs();
      }
      // Ctrl+F — Find
      if (ctrl && !shift && e.key === 'f') {
        // Monaco handles this, but need to be in editor module
        const editorModule = document.getElementById('module-editor');
        if (editorModule.classList.contains('active')) {
          // Let Monaco handle it
        }
      }
      // Ctrl+H — Replace
      if (ctrl && !shift && e.key === 'h') {
        e.preventDefault();
        window.searchManager.openReplace();
      }
      // Ctrl+Shift+T — Toggle theme
      if (ctrl && shift && e.key === 'T') {
        e.preventDefault();
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        window.editorManager.setTheme(newTheme);
        if (window.settingsManager) {
          window.settingsManager.settings.theme = newTheme;
          window.settingsManager.saveSettings();
          document.querySelectorAll('.theme-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.theme === newTheme);
          });
        }
      }
      // F11 — Fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        window.api.fullscreen();
      }
      // Ctrl+= — Zoom in
      if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const slider = document.getElementById('font-size-slider');
        if (slider) {
          slider.value = Math.min(24, parseInt(slider.value) + 1);
          slider.dispatchEvent(new Event('input'));
        }
      }
      // Ctrl+- — Zoom out
      if (ctrl && e.key === '-') {
        e.preventDefault();
        const slider = document.getElementById('font-size-slider');
        if (slider) {
          slider.value = Math.max(10, parseInt(slider.value) - 1);
          slider.dispatchEvent(new Event('input'));
        }
      }
      // Ctrl+W — Close tab
      if (ctrl && !shift && e.key === 'w') {
        e.preventDefault();
        if (window.tabManager.activeTabId) {
          window.tabManager.closeTab(window.tabManager.activeTabId);
        }
      }
      // Ctrl+Tab — Next tab
      if (ctrl && e.key === 'Tab') {
        e.preventDefault();
        const tabs = window.tabManager.tabs;
        const currentIdx = tabs.findIndex(t => t.id === window.tabManager.activeTabId);
        const nextIdx = (currentIdx + 1) % tabs.length;
        window.tabManager.activateTab(tabs[nextIdx].id);
      }
      // Ctrl+Shift+P — Toggle markdown preview
      if (ctrl && shift && e.key === 'P') {
        e.preventDefault();
        window.markdownPreview.toggle();
      }
      // Escape — close modal
      if (e.key === 'Escape') {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay.classList.contains('hidden')) {
          overlay.classList.add('hidden');
        }
        // Close snooze dropdowns
        document.querySelectorAll('.snooze-dropdown').forEach(d => d.remove());
        // Close reminder popups
        document.querySelectorAll('.reminder-popup').forEach(p => p.remove());
      }
    });

    // Menu events from main process
    window.api.onMenuEvent('menu-new-file', () => window.fileManager.newFile());
    window.api.onMenuEvent('menu-open-file', () => window.fileManager.openFile());
    window.api.onMenuEvent('menu-save', () => window.fileManager.save());
    window.api.onMenuEvent('menu-save-as', () => window.fileManager.saveAs());
    window.api.onMenuEvent('menu-open-folder', async () => {
      window.sidebarManager.toggle(true);
      await window.sidebarManager.openFolder();
    });
    window.api.onMenuEvent('menu-find', () => window.searchManager.openFind());
    window.api.onMenuEvent('menu-replace', () => window.searchManager.openReplace());
    window.api.onMenuEvent('menu-toggle-theme', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      window.editorManager.setTheme(newTheme);
      if (window.settingsManager) {
        window.settingsManager.settings.theme = newTheme;
        window.settingsManager.saveSettings();
      }
    });
    window.api.onMenuEvent('menu-fullscreen', () => window.api.fullscreen());
    window.api.onMenuEvent('menu-zoom-in', () => {
      const slider = document.getElementById('font-size-slider');
      if (slider) { slider.value = Math.min(24, parseInt(slider.value) + 1); slider.dispatchEvent(new Event('input')); }
    });
    window.api.onMenuEvent('menu-zoom-out', () => {
      const slider = document.getElementById('font-size-slider');
      if (slider) { slider.value = Math.max(10, parseInt(slider.value) - 1); slider.dispatchEvent(new Event('input')); }
    });
  }
}

window.shortcutManager = new ShortcutManager();
