/* ═══════════════════════════════════════════════════ 
   TABS — Multi-tab management with note support
   ═══════════════════════════════════════════════════ */

class TabManager {
  constructor() {
    this.tabs = []; // { id, title, filePath, noteId, modified, type: 'file'|'note' }
    this.activeTabId = null;
    this._noteAutoSave = null;
  }

  init() {
    document.getElementById('btn-new-tab').addEventListener('click', () => this.createTab());
    document.getElementById('btn-new-note').addEventListener('click', () => this.promptNewNote());
    this.createTab(); // Start with one tab
  }

  createTab(title = null, filePath = null, content = '') {
    const id = window.dataStore.generateId();
    const tabTitle = title || (filePath ? filePath.split(/[/\\]/).pop() : window.i18n.t('untitled'));
    const lang = filePath ? window.editorManager.detectLanguage(filePath) : 'plaintext';

    this.tabs.push({ id, title: tabTitle, filePath, noteId: null, modified: false, type: 'file' });
    window.editorManager.createModel(id, content, lang);
    this.renderTabs();
    this.activateTab(id);
    return id;
  }

  // Prompt for note title before creating
  promptNewNote(opts = {}) {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📝 Yeni Not</h3>
        <button class="icon-btn" id="modal-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Not Başlığı</label>
          <input type="text" id="note-title-input" placeholder="örn: Müşteri Toplantısı, Fiyat Notu..." value="${opts.title || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Kategori</label>
            <select id="note-category-input">${window.tagSystem.renderCategorySelect(opts.category)}</select>
          </div>
          <div class="form-group">
            <label>Müşteri</label>
            <select id="note-customer-input">${window.tagSystem.renderCustomerSelect(opts.customerId)}</select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">İptal</button>
        <button class="btn-primary" id="modal-save">Oluştur</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('note-title-input').focus();

    const close = () => document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-close').addEventListener('click', close);
    document.getElementById('modal-cancel').addEventListener('click', close);

    // Enter key to save
    document.getElementById('note-title-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('modal-save').click();
    });

    document.getElementById('modal-save').addEventListener('click', async () => {
      const title = document.getElementById('note-title-input').value.trim() || 'Yeni Not';
      const category = document.getElementById('note-category-input').value || null;
      const customerId = document.getElementById('note-customer-input').value || null;

      const note = await window.notesManager.createNote({
        title,
        category,
        customerId,
        isMeeting: opts.isMeeting || false,
        content: opts.content || ''
      });

      close();
      await this.createNoteTab(note);
    });
  }

  async createNoteTab(noteData = null) {
    const note = noteData || await window.notesManager.createNote();
    const id = window.dataStore.generateId();

    this.tabs.push({
      id,
      title: note.title,
      filePath: null,
      noteId: note.id,
      modified: false,
      type: 'note'
    });

    window.editorManager.createModel(id, note.content, 'plaintext');
    this.renderTabs();
    this.activateTab(id);
    return id;
  }

  async openExistingNote(noteId) {
    // Check if already open
    const existing = this.tabs.find(t => t.noteId === noteId);
    if (existing) {
      this.activateTab(existing.id);
      return;
    }

    const note = window.notesManager.getById(noteId);
    if (note) {
      await this.createNoteTab(note);
    }
  }

  activateTab(id) {
    this.activeTabId = id;
    window.editorManager.switchToTab(id);
    this.renderTabs();
    
    const tab = this.tabs.find(t => t.id === id);

    // Update statusbar
    this.updateStatusBarTag(id);
    this.updateNoteMetaDisplay();
    
    // Show markdown preview if .md file
    if (tab?.filePath?.endsWith('.md') && window.markdownPreview) {
      window.markdownPreview.toggle(true);
    }
  }

  async updateStatusBarTag(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    const statusTag = document.getElementById('status-customer-tag');
    
    if (tab?.noteId) {
      const note = window.notesManager?.getById(tab.noteId);
      if (note?.customerId) {
        const name = window.tagSystem.getCustomerName(note.customerId);
        statusTag.textContent = `👤 ${name}`;
        statusTag.classList.remove('hidden');
        return;
      }
      // Also check customerTags
      if (note?.customerTags?.length > 0) {
        const names = note.customerTags.map(id => window.tagSystem.getCustomerName(id)).filter(Boolean);
        if (names.length > 0) {
          statusTag.textContent = `👤 ${names.join(', ')}`;
          statusTag.classList.remove('hidden');
          return;
        }
      }
    }

    const notesMeta = await window.dataStore.getNotesMeta();
    const meta = tab?.filePath && notesMeta[tab.filePath];
    if (meta?.customerId) {
      const name = window.tagSystem.getCustomerName(meta.customerId);
      statusTag.textContent = `👤 ${name}`;
      statusTag.classList.remove('hidden');
    } else {
      statusTag.classList.add('hidden');
    }
  }

  updateNoteMetaDisplay() {
    const tab = this.getActiveTab();
    const metaBar = document.getElementById('note-meta-bar');
    if (!metaBar) return;

    if (tab?.noteId) {
      const note = window.notesManager?.getById(tab.noteId);
      if (note) {
        const cat = note.category ? window.tagSystem.getCategoryById(note.category) : null;
        const customer = note.customerId ? window.tagSystem.getCustomerById(note.customerId) : null;
        const mentions = note.customerTags?.map(id => window.tagSystem.getCustomerById(id)).filter(Boolean) || [];

        let html = `<span class="note-meta-tag note-title-tag" data-rename-note="${note.id}" title="Başlığı değiştirmek için tıklayın">✏️ ${note.title}</span>`;
        if (cat) {
          html += `<span class="note-meta-tag" style="background:${cat.color}20;color:${cat.color};border:1px solid ${cat.color}40">🏷️ ${cat.name}</span>`;
        }
        if (customer) {
          html += `<span class="note-meta-tag customer-tag">👤 ${customer.name}</span>`;
        }
        if (mentions.length > 0) {
          // Don't duplicate if customerId is already shown
          const filteredMentions = mentions.filter(m => m.id !== note.customerId);
          html += filteredMentions.map(m => `<span class="note-meta-tag mention-tag">@${m.name}</span>`).join('');
        }
        if (note.isMeeting) {
          html += `<span class="note-meta-tag meeting-tag">🤝 Toplantı</span>`;
        }
        html += `<span class="note-meta-hint" style="margin-left:auto">💡 <code>@</code> müşteri · <code>/</code> komut</span>`;
        
        metaBar.innerHTML = html;
        metaBar.classList.remove('hidden');

        // Rename click
        metaBar.querySelector('[data-rename-note]')?.addEventListener('click', () => {
          this.renameNote(note.id);
        });
        return;
      }
    }
    metaBar.classList.add('hidden');
  }

  renameNote(noteId) {
    const note = window.notesManager?.getById(noteId);
    if (!note) return;
    const tab = this.tabs.find(t => t.noteId === noteId);

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>Not Başlığını Değiştir</h3>
        <button class="icon-btn" id="modal-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Başlık</label>
          <input type="text" id="rename-input" value="${note.title}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">İptal</button>
        <button class="btn-primary" id="modal-save">Kaydet</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');
    const input = document.getElementById('rename-input');
    input.focus();
    input.select();

    const close = () => document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-close').addEventListener('click', close);
    document.getElementById('modal-cancel').addEventListener('click', close);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('modal-save').click(); });

    document.getElementById('modal-save').addEventListener('click', async () => {
      const newTitle = input.value.trim() || 'Yeni Not';
      await window.notesManager.updateNote(noteId, { title: newTitle });
      if (tab) { tab.title = newTitle; this.renderTabs(); }
      close();
      this.updateNoteMetaDisplay();
    });
  }

  async flushNoteSave() {
    clearTimeout(this._noteAutoSave);
    const tab = this.getActiveTab();
    if (tab?.noteId && window.notesManager) {
      const content = window.editorManager.getContent(tab.id);
      await window.notesManager.updateNote(tab.noteId, { content });
      tab.modified = false;
      this.updateNoteMetaDisplay();
    }
  }

  closeTab(id) {
    const index = this.tabs.findIndex(t => t.id === id);
    if (index === -1) return;

    const tab = this.tabs[index];

    // If it's a note, save content before closing
    if (tab.noteId && window.notesManager) {
      const content = window.editorManager.getContent(id);
      window.notesManager.updateNote(tab.noteId, { content });
    }

    // Don't close the last tab, create a new one instead
    if (this.tabs.length === 1) {
      window.editorManager.removeModel(id);
      this.tabs = [];
      this.createTab();
      return;
    }

    window.editorManager.removeModel(id);
    this.tabs.splice(index, 1);

    if (this.activeTabId === id) {
      const newIndex = Math.min(index, this.tabs.length - 1);
      this.activateTab(this.tabs[newIndex].id);
    } else {
      this.renderTabs();
    }
  }

  markModified(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (!tab.modified) {
      tab.modified = true;
      this.renderTabs();
    }

    // Always debounce auto-save for notes (not just first change)
    if (tab.noteId && window.notesManager) {
      clearTimeout(this._noteAutoSave);
      this._noteAutoSave = setTimeout(async () => {
        const content = window.editorManager.getContent(tabId);
        await window.notesManager.updateNote(tab.noteId, { content });
        tab.modified = false;
        this.renderTabs();
        this.updateNoteMetaDisplay();
        this.updateStatusBarTag(tabId);
      }, 1500);
    }
  }

  markSaved(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.modified = false;
      this.renderTabs();
    }
  }

  updateTitle(tabId, title, filePath) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.title = title;
      tab.filePath = filePath;
      this.renderTabs();
    }
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  getTabByFilePath(filePath) {
    return this.tabs.find(t => t.filePath === filePath);
  }

  renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = this.tabs.map(tab => `
      <div class="tab ${tab.id === this.activeTabId ? 'active' : ''} ${tab.modified ? 'modified' : ''} ${tab.type === 'note' ? 'tab-note' : ''}" 
           data-tab-id="${tab.id}">
        ${tab.type === 'note' ? '<span class="tab-note-icon">📝</span>' : ''}
        <span class="tab-title">${tab.title}</span>
        <button class="tab-close" data-tab-close="${tab.id}">
          <svg width="10" height="10" viewBox="0 0 12 12">
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/>
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Event listeners
    container.querySelectorAll('.tab').forEach(el => {
      el.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close') && !e.target.closest('.tab-rename-input')) {
          this.activateTab(el.dataset.tabId);
        }
      });
      // Double-click to inline rename any tab
      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const tab = this.tabs.find(t => t.id === el.dataset.tabId);
        if (!tab) return;
        this.startInlineRename(el, tab);
      });
    });
    container.querySelectorAll('.tab-close').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(el.dataset.tabClose);
      });
    });
  }

  startInlineRename(tabEl, tab) {
    const titleEl = tabEl.querySelector('.tab-title');
    if (!titleEl) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-rename-input';
    input.value = tab.title;
    input.style.cssText = 'width:' + Math.max(60, titleEl.offsetWidth + 10) + 'px;font-size:12px;padding:1px 4px;border:1px solid var(--accent-primary);border-radius:3px;background:var(--bg-primary);color:var(--text-primary);outline:none;';

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = async () => {
      const newTitle = input.value.trim() || tab.title;
      tab.title = newTitle;

      // If it's a note, also update in notesManager
      if (tab.noteId && window.notesManager) {
        await window.notesManager.updateNote(tab.noteId, { title: newTitle });
        this.updateNoteMetaDisplay();
      }

      this.renderTabs();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = tab.title; input.blur(); }
    });
  }
}

window.tabManager = new TabManager();
