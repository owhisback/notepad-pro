/* ═══════════════════════════════════════════════════ 
   NOTES — OneNote-style with Notebooks, Pages & Panel UI
   ═══════════════════════════════════════════════════ */

class NotesManager {
  constructor() {
    this.notes = [];
    this.notebooks = []; // { id, name, icon }
    this.activeNotebook = null; // null = show "select a notebook" prompt
    this.pageSearch = '';
  }

  async init() {
    this.notes = await window.dataStore.getNotes();
    this.notebooks = await window.dataStore.get('notebooks') || [];

    // Auto-select first notebook if any
    if (this.notebooks.length > 0) {
      this.activeNotebook = this.notebooks[0].id;
    }

    this.setupPanelEvents();
    this.renderNotebooks();
    this.renderPages();
  }

  setupPanelEvents() {
    document.getElementById('btn-add-notebook')?.addEventListener('click', () => this.addNotebook());

    document.getElementById('btn-add-page')?.addEventListener('click', () => {
      if (!this.activeNotebook) {
        showToast('Önce bir defter oluşturun veya seçin', 'warning');
        return;
      }
      this.createQuickNote();
    });

    document.getElementById('page-search')?.addEventListener('input', (e) => {
      this.pageSearch = e.target.value.toLowerCase();
      this.renderPages();
    });
  }

  // ═══ QUICK NOTE (no modal, just create and open) ═══
  async createQuickNote() {
    const note = await this.createNote({
      title: 'Yeni Not',
      notebook: this.activeNotebook
    });
    await window.tabManager.createNoteTab(note);
  }

  // ═══ NOTEBOOK CRUD ═══
  async addNotebook() {
    const icons = ['📁', '💼', '🏢', '📋', '📌', '🎯', '💡', '🔖', '📎', '🗂️', '🤝', '📊', '🔔', '✅'];
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📓 Yeni Defter</h3>
        <button class="icon-btn" id="modal-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Defter Adı</label>
          <input type="text" id="nb-name-input" placeholder="örn: İş, Kişisel, Müşteriler...">
        </div>
        <div class="form-group">
          <label>İkon</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${icons.map((icon, i) => `<button class="icon-pick-btn ${i === 0 ? 'active' : ''}" data-icon="${icon}" style="font-size:16px;padding:5px 7px;border:1px solid var(--border-primary);border-radius:var(--radius-sm);background:var(--bg-secondary);cursor:pointer;transition:border-color 0.1s">${icon}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">İptal</button>
        <button class="btn-primary" id="modal-save">Oluştur</button>
      </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('nb-name-input').focus();

    let selectedIcon = icons[0];
    modal.querySelectorAll('.icon-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.icon-pick-btn').forEach(b => { b.classList.remove('active'); b.style.borderColor = 'var(--border-primary)'; });
        btn.classList.add('active');
        btn.style.borderColor = 'var(--accent-primary)';
        selectedIcon = btn.dataset.icon;
      });
    });

    const close = () => document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-close').addEventListener('click', close);
    document.getElementById('modal-cancel').addEventListener('click', close);
    document.getElementById('nb-name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('modal-save').click(); });

    document.getElementById('modal-save').addEventListener('click', async () => {
      const name = document.getElementById('nb-name-input').value.trim();
      if (!name) return;
      const nb = { id: window.dataStore.generateId(), name, icon: selectedIcon };
      this.notebooks.push(nb);
      await window.dataStore.set('notebooks', this.notebooks);
      this.activeNotebook = nb.id;
      close();
      this.renderNotebooks();
      this.renderPages();
      showToast(`"${name}" defteri oluşturuldu`, 'success');
    });
  }

  async renameNotebook(nbId) {
    const nb = this.notebooks.find(n => n.id === nbId);
    if (!nb) return;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>Defter Adını Değiştir</h3>
        <button class="icon-btn" id="modal-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Yeni Ad</label>
          <input type="text" id="nb-rename-input" value="${nb.name}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">İptal</button>
        <button class="btn-primary" id="modal-save">Kaydet</button>
      </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
    const input = document.getElementById('nb-rename-input');
    input.focus();
    input.select();

    const close = () => document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-close').addEventListener('click', close);
    document.getElementById('modal-cancel').addEventListener('click', close);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('modal-save').click(); });

    document.getElementById('modal-save').addEventListener('click', async () => {
      const newName = input.value.trim() || nb.name;
      nb.name = newName;
      await window.dataStore.set('notebooks', this.notebooks);
      close();
      this.renderNotebooks();
    });
  }

  async deleteNotebook(id) {
    const nb = this.notebooks.find(n => n.id === id);
    const noteCount = this.notes.filter(n => n.notebook === id).length;
    const msg = noteCount > 0
      ? `Bu defteri ve içindeki ${noteCount} notu silmek istediğinize emin misiniz?`
      : 'Bu defteri silmek istediğinize emin misiniz?';
    if (!await showConfirm(msg, nb?.name)) return;

    // Delete notes in the notebook too
    this.notes = this.notes.filter(n => n.notebook !== id);
    await this.saveNotes();

    this.notebooks = this.notebooks.filter(nb => nb.id !== id);
    await window.dataStore.set('notebooks', this.notebooks);

    if (this.activeNotebook === id) {
      this.activeNotebook = this.notebooks.length > 0 ? this.notebooks[0].id : null;
    }
    this.renderNotebooks();
    this.renderPages();
  }

  // ═══ PANEL RENDERING ═══
  renderNotebooks() {
    const container = document.getElementById('notebook-list');
    if (!container) return;

    if (this.notebooks.length === 0) {
      container.innerHTML = '<div class="page-list-empty" style="padding:16px;font-size:12px;color:var(--text-tertiary)">Henüz defter yok.<br>Aşağıdaki butona tıklayarak<br>ilk defterinizi oluşturun.</div>';
      return;
    }

    let html = '';
    for (const nb of this.notebooks) {
      const count = this.notes.filter(n => n.notebook === nb.id).length;
      html += `
        <div class="notebook-item ${this.activeNotebook === nb.id ? 'active' : ''}" data-notebook="${nb.id}">
          <span class="nb-icon">${nb.icon}</span>
          <span class="nb-name">${nb.name}</span>
          <span class="nb-count">${count}</span>
        </div>
      `;
    }

    container.innerHTML = html;

    // Click to select
    container.querySelectorAll('.notebook-item').forEach(el => {
      el.addEventListener('click', () => {
        this.activeNotebook = el.dataset.notebook;
        this.renderNotebooks();
        this.renderPages();
      });

      // Double-click to rename
      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
        this.renameNotebook(el.dataset.notebook);
      });

      // Right-click to delete
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.deleteNotebook(el.dataset.notebook);
      });
    });
  }

  renderPages() {
    const container = document.getElementById('page-list');
    if (!container) return;

    if (!this.activeNotebook) {
      container.innerHTML = '<div class="page-list-empty">Bir defter seçin veya<br>yeni defter oluşturun.</div>';
      return;
    }

    let filtered = this.notes.filter(n => n.notebook === this.activeNotebook);
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (this.pageSearch) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(this.pageSearch) ||
        (n.content || '').toLowerCase().includes(this.pageSearch)
      );
    }

    const nb = this.notebooks.find(n => n.id === this.activeNotebook);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="page-list-empty">"${nb?.name || ''}" defterinde henüz not yok.<br>+ butonuna tıklayarak yeni not ekleyin.</div>`;
      return;
    }

    container.innerHTML = filtered.map(note => {
      const preview = (note.content || '').substring(0, 80).replace(/\n/g, ' ').trim();
      const date = this.formatDate(note.updatedAt);
      const activeTab = window.tabManager?.getActiveTab();
      const isActive = activeTab?.noteId === note.id;

      return `
        <div class="page-item ${isActive ? 'active' : ''}" data-page-id="${note.id}">
          <div class="page-item-row">
            <div class="page-item-title">${escapeHtml(note.title)}</div>
            <button class="page-item-delete" data-delete-note="${note.id}" title="Sil">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          ${preview ? `<div class="page-item-preview">${escapeHtml(preview)}</div>` : ''}
          <div class="page-item-meta">
            <span class="page-item-date">${date}</span>
          </div>
        </div>
      `;
    }).join('');

    // Click to open note
    container.querySelectorAll('.page-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.page-item-delete')) return;
        window.tabManager.openExistingNote(el.dataset.pageId);
        container.querySelectorAll('.page-item').forEach(p => p.classList.remove('active'));
        el.classList.add('active');
      });
    });

    // Delete note button
    container.querySelectorAll('[data-delete-note]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const noteId = el.dataset.deleteNote;
        const note = this.getById(noteId);
        if (!await showConfirm('Bu notu silmek istediğinize emin misiniz?', note?.title)) return;

        // Close tab if open
        const openTab = window.tabManager?.tabs.find(t => t.noteId === noteId);
        if (openTab) window.tabManager.closeTab(openTab.id);

        await this.deleteNote(noteId);
        showToast('Not silindi', 'success');
      });
    });
  }

  // ═══ NOTE CRUD ═══
  async createNote(opts = {}) {
    const note = {
      id: window.dataStore.generateId(),
      title: opts.title || 'Yeni Not',
      content: opts.content || '',
      category: opts.category || null,
      customerId: opts.customerId || null,
      notebook: opts.notebook || this.activeNotebook || null,
      isMeeting: opts.isMeeting || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.notes.push(note);
    await this.saveNotes();
    this.renderPages();
    this.renderNotebooks();
    return note;
  }

  async updateNote(id, data) {
    const idx = this.notes.findIndex(n => n.id === id);
    if (idx >= 0) {
      Object.assign(this.notes[idx], data, { updatedAt: new Date().toISOString() });
      await this.saveNotes();
      this.renderPages();
      return this.notes[idx];
    }
    return null;
  }

  async deleteNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    await this.saveNotes();
    this.renderPages();
    this.renderNotebooks();
  }

  getById(id) {
    return this.notes.find(n => n.id === id);
  }

  getByCustomer(customerId) {
    return this.notes.filter(n => n.customerId === customerId);
  }

  getMeetingNotes() {
    return this.notes.filter(n => n.isMeeting).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getAllNotes() {
    return [...this.notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async saveNotes() {
    await window.dataStore.saveNotes(this.notes);
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Şimdi';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' dk';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' saat';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }

  // Extract @mentions from content and return customer IDs
  extractMentions(content) {
    if (!content) return [];
    const mentions = [];
    const regex = /@([\w\sçğıöşüÇĞİÖŞÜ]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1].trim();
      const customer = window.tagSystem?.customers?.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (customer) {
        mentions.push(customer.id);
      }
    }
    return [...new Set(mentions)];
  }

  // Parse /commands from content
  parseSlashCommands(content) {
    const commands = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('/lead')) {
        commands.push({ type: 'lead', line: trimmed });
      } else if (trimmed.startsWith('/task') || trimmed.startsWith('/görev')) {
        commands.push({ type: 'task', line: trimmed });
      } else if (trimmed.startsWith('/reminder') || trimmed.startsWith('/hatırlatıcı') || trimmed.startsWith('/hatırlat')) {
        commands.push({ type: 'reminder', line: trimmed });
      }
    }
    return commands;
  }
}

window.notesManager = new NotesManager();
