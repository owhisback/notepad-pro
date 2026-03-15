/* ═══════════════════════════════════════════════════ 
   APP — Main application bootstrap
   ═══════════════════════════════════════════════════ */

class App {
  async init() {
    console.log('🚀 Notepad Pro starting...');

    // Render Lucide icons
    if (window.lucide) lucide.createIcons();

    // Load settings first
    const settings = await window.dataStore.getSettings();

    // Initialize tag system (needs data)
    await window.tagSystem.init();

    // Initialize settings (applies theme, language)
    await window.settingsManager.init();

    // Initialize editor (loads Monaco)
    await window.editorManager.init(settings);

    // Initialize tab system
    window.tabManager.init();

    // Initialize file manager
    window.fileManager.init(settings);

    // Initialize sidebar
    window.sidebarManager.init();

    // Initialize markdown preview
    window.markdownPreview.init();

    // Initialize notes manager (before tasks/customers so data is available)
    await window.notesManager.init();

    // Initialize business modules
    await window.taskManager.init();
    await window.leadManager.init();
    await window.customerManager.init();
    await window.reminderManager.init();
    window.meetingManager.init();

    // Initialize dashboard (after all data sources are ready)
    window.dashboardManager.init();

    // Initialize shortcuts (last, so all managers are ready)
    window.shortcutManager.init();

    // Setup navigation & sidebar pin
    this.setupNavigation();
    this.setupSidebarPin();

    console.log('✅ Notepad Pro ready!');
  }

  setupSidebarPin() {
    const sidebar = document.getElementById('nav-sidebar');
    const pinBtn = document.getElementById('btn-sidebar-pin');
    if (!pinBtn) return;

    pinBtn.addEventListener('click', () => {
      sidebar.classList.toggle('expanded');
      // Update icon
      const isPinned = sidebar.classList.contains('expanded');
      const label = pinBtn.querySelector('.nav-label');
      if (label) label.textContent = isPinned ? 'Daralt' : 'Sabitle';
    });
  }

  setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn[data-module]');
    
    navBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const module = btn.dataset.module;

        // Handle files separately (toggle sidebar)
        if (module === 'files') {
          window.sidebarManager.toggle();
          return;
        }

        // Flush any pending note auto-saves before switching
        await window.tabManager.flushNoteSave();

        // Deactivate all
        navBtns.forEach(b => {
          if (b.dataset.module !== 'files') b.classList.remove('active');
        });
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));

        // Activate selected
        btn.classList.add('active');
        const moduleEl = document.getElementById(`module-${module}`);
        if (moduleEl) {
          moduleEl.classList.add('active');
        }

        // Focus editor if switching to editor module
        if (module === 'editor') {
          setTimeout(() => window.editorManager.focus(), 100);
        }

        // Refresh modules on switch
        if (module === 'dashboard') window.dashboardManager.render();
        if (module === 'tasks') window.taskManager.render();
        if (module === 'leads') window.leadManager.render();
        if (module === 'customers') window.customerManager.render();
        if (module === 'reminders') window.reminderManager.render();
        if (module === 'meetings') window.meetingManager.render();
      });
    });
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => {
    console.error('Failed to initialize Notepad Pro:', err);
  });
});
