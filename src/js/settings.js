/* ═══════════════════════════════════════════════════ 
   SETTINGS — User preferences
   ═══════════════════════════════════════════════════ */

class SettingsManager {
  constructor() {
    this.settings = null;
  }

  async init() {
    this.settings = await window.dataStore.getSettings();
    this.applySettings();
    this.bindEvents();
    this.renderCategories();
  }

  applySettings() {
    // Theme
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    
    // Language
    window.i18n.setLanguage(this.settings.language || 'tr');
  }

  bindEvents() {
    // Theme toggle
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        window.editorManager.setTheme(this.settings.theme);
        await this.saveSettings();
      });
    });
    
    // Update active theme button
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.settings.theme);
    });

    // Font size
    const fontSlider = document.getElementById('font-size-slider');
    const fontValue = document.getElementById('font-size-value');
    fontSlider.value = this.settings.fontSize || 14;
    fontValue.textContent = fontSlider.value + 'px';
    fontSlider.addEventListener('input', async () => {
      this.settings.fontSize = parseInt(fontSlider.value);
      fontValue.textContent = fontSlider.value + 'px';
      window.editorManager.setFontSize(this.settings.fontSize);
      await this.saveSettings();
    });

    // Font family
    const fontSelect = document.getElementById('font-family-select');
    fontSelect.value = this.settings.fontFamily || "'JetBrains Mono', monospace";
    fontSelect.addEventListener('change', async () => {
      this.settings.fontFamily = fontSelect.value;
      window.editorManager.setFontFamily(this.settings.fontFamily);
      await this.saveSettings();
    });

    // Minimap
    const minimapToggle = document.getElementById('minimap-toggle');
    minimapToggle.checked = this.settings.minimap !== false;
    minimapToggle.addEventListener('change', async () => {
      this.settings.minimap = minimapToggle.checked;
      window.editorManager.setMinimap(this.settings.minimap);
      await this.saveSettings();
    });

    // Language
    const langSelect = document.getElementById('language-select');
    langSelect.value = this.settings.language || 'tr';
    langSelect.addEventListener('change', async () => {
      this.settings.language = langSelect.value;
      window.i18n.setLanguage(this.settings.language);
      await this.saveSettings();
      // Re-render modules
      window.taskManager?.render();
      window.leadManager?.render();
      window.customerManager?.render();
      window.reminderManager?.render();
    });

    // Autosave
    const autosaveToggle = document.getElementById('autosave-toggle');
    autosaveToggle.checked = this.settings.autosave !== false;
    autosaveToggle.addEventListener('change', async () => {
      this.settings.autosave = autosaveToggle.checked;
      if (this.settings.autosave) {
        window.fileManager.startAutosave();
      } else {
        window.fileManager.stopAutosave();
      }
      await this.saveSettings();
    });

    // Add category
    document.getElementById('btn-add-category').addEventListener('click', async () => {
      const nameInput = document.getElementById('new-category-name');
      const colorInput = document.getElementById('new-category-color');
      const name = nameInput.value.trim();
      if (!name) return;

      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!this.settings.categories) this.settings.categories = [];
      this.settings.categories.push({ id, name, color: colorInput.value });
      
      await this.saveSettings();
      await window.tagSystem.refreshCategories();
      this.renderCategories();
      window.taskManager?.updateCategoryFilter();
      nameInput.value = '';
    });
  }

  renderCategories() {
    const container = document.getElementById('categories-list');
    if (!this.settings.categories) return;

    container.innerHTML = this.settings.categories.map(cat => `
      <div class="category-item" data-cat-id="${cat.id}">
        <div class="cat-info">
          <span class="cat-color" style="background:${cat.color}"></span>
          <span class="cat-name">${cat.name}</span>
        </div>
        <button class="icon-btn" data-cat-delete="${cat.id}">
          <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-cat-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.settings.categories = this.settings.categories.filter(c => c.id !== btn.dataset.catDelete);
        await this.saveSettings();
        await window.tagSystem.refreshCategories();
        this.renderCategories();
        window.taskManager?.updateCategoryFilter();
      });
    });
  }

  async saveSettings() {
    await window.dataStore.saveSettings(this.settings);
  }
}

window.settingsManager = new SettingsManager();
