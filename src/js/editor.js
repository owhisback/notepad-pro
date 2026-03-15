/* ═══════════════════════════════════════════════════ 
   EDITOR — Monaco Editor wrapper
   ═══════════════════════════════════════════════════ */

class EditorManager {
  constructor() {
    this.editor = null;
    this.models = new Map(); // tabId -> model
    this.currentTabId = null;
    this.monacoLoaded = false;
  }

  async init(settings) {
    try {
      await this.loadMonaco();
      this.createEditor(settings);
    } catch (err) {
      const container = document.getElementById('editor-container');
      container.innerHTML = `
        <div class="editor-load-error">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Editör yüklenemedi.</p>
          <small>node_modules klasörünün mevcut olduğundan emin olun: <code>npm install</code></small>
        </div>
      `;
    }
  }

  loadMonaco() {
    // Load Monaco from local node_modules (offline-safe)
    const monacoBase = '../node_modules/monaco-editor/min/vs';

    return new Promise((resolve, reject) => {
      if (this.monacoLoaded) { resolve(); return; }

      const loaderScript = document.createElement('script');
      loaderScript.src = monacoBase + '/loader.js';
      loaderScript.onerror = () => reject(new Error('Monaco loader bulunamadı. npm install çalıştırın.'));
      loaderScript.onload = () => {
        require.config({ paths: { vs: monacoBase } });
        require(['vs/editor/editor.main'], () => {
          this.monacoLoaded = true;

          // Define custom dark theme
          monaco.editor.defineTheme('notepad-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: 'comment', foreground: '6a6a7f', fontStyle: 'italic' },
              { token: 'keyword', foreground: '6c5ce7' },
              { token: 'string', foreground: '00b894' },
              { token: 'number', foreground: 'fdcb6e' },
              { token: 'type', foreground: '74b9ff' },
            ],
            colors: {
              'editor.background': '#0a0a0f',
              'editor.foreground': '#e8e8ed',
              'editor.lineHighlightBackground': '#1a1a25',
              'editor.selectionBackground': '#6c5ce740',
              'editorCursor.foreground': '#6c5ce7',
              'editorLineNumber.foreground': '#3a3a4f',
              'editorLineNumber.activeForeground': '#6c5ce7',
              'editor.inactiveSelectionBackground': '#6c5ce720',
              'editorIndentGuide.background': '#1a1a25',
              'editorIndentGuide.activeBackground': '#2a2a3a',
              'minimap.background': '#08080d',
            }
          });

          monaco.editor.defineTheme('notepad-light', {
            base: 'vs',
            inherit: true,
            rules: [
              { token: 'comment', foreground: '8a8aa0', fontStyle: 'italic' },
              { token: 'keyword', foreground: '6c5ce7' },
              { token: 'string', foreground: '00a884' },
              { token: 'number', foreground: 'e17055' },
              { token: 'type', foreground: '0984e3' },
            ],
            colors: {
              'editor.background': '#f5f5fa',
              'editor.foreground': '#1a1a2e',
              'editor.lineHighlightBackground': '#eeeef5',
              'editor.selectionBackground': '#6c5ce730',
              'editorCursor.foreground': '#6c5ce7',
              'editorLineNumber.foreground': '#aaaacc',
              'editorLineNumber.activeForeground': '#6c5ce7',
              'minimap.background': '#eaeaf2',
            }
          });

          resolve();
        });
      };
      document.head.appendChild(loaderScript);
    });
  }

  createEditor(settings) {
    const container = document.getElementById('editor-container');
    this.editor = monaco.editor.create(container, {
      value: '',
      language: 'plaintext',
      theme: settings.theme === 'dark' ? 'notepad-dark' : 'notepad-light',
      fontFamily: settings.fontFamily || "'JetBrains Mono', monospace",
      fontSize: settings.fontSize || 14,
      minimap: { enabled: settings.minimap !== false },
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      roundedSelection: true,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      bracketPairColorization: { enabled: true },
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      wordBasedSuggestions: false,
    });

    // Cursor position update
    this.editor.onDidChangeCursorPosition((e) => {
      const pos = e.position;
      document.getElementById('status-line-col').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    });

    // Content change -> word count & modified flag
    this.editor.onDidChangeModelContent((e) => {
      this.updateWordCount();
      if (window.tabManager) {
        window.tabManager.markModified(this.currentTabId);
      }

      // Manually trigger suggestions when @ or / is typed
      // (Monaco's triggerCharacters doesn't work reliably for plaintext)
      if (e.changes) {
        for (const change of e.changes) {
          if (change.text === '@' || change.text === '/') {
            // Small delay to let Monaco process the character first
            setTimeout(() => {
              this.editor.trigger('custom', 'editor.action.triggerSuggest', {});
            }, 50);
            break;
          }
        }
      }
    });

    // Custom @mention and /command popup (Monaco's built-in suggest doesn't work for plaintext)
    this.setupCustomPopup();
  }

  // ══════════════════════════════════════════════
  // CUSTOM POPUP — @mention & /command
  // ══════════════════════════════════════════════
  setupCustomPopup() {
    // Create popup element
    this.popup = document.createElement('div');
    this.popup.className = 'mention-popup hidden';
    this.popup.id = 'mention-popup';
    document.getElementById('editor-wrapper').appendChild(this.popup);

    this.popupItems = [];
    this.popupIndex = 0;
    this.popupMode = null; // 'command'
    this.popupAnchor = null;

    // Listen for content changes to detect /
    this.editor.onDidChangeModelContent((e) => {
      this.checkPopupTrigger(e);
      this.checkForSlashCommand(e);
    });

    // Listen for cursor position changes to close popup when moving away
    this.editor.onDidChangeCursorPosition(() => {
      if (this.popupMode) {
        this.updatePopupContent();
      }
    });

    // Close popup on blur
    this.editor.onDidBlurEditorText(() => {
      setTimeout(() => this.hidePopup(), 200);
    });

    // Intercept keyboard when popup is open
    this.editor.onKeyDown((e) => {
      if (!this.popupMode || this.popupItems.length === 0) return;

      if (e.keyCode === monaco.KeyCode.Escape) {
        e.preventDefault();
        e.stopPropagation();
        this.hidePopup();
      } else if (e.keyCode === monaco.KeyCode.Enter || e.keyCode === monaco.KeyCode.Tab) {
        e.preventDefault();
        e.stopPropagation();
        this.selectPopupItem(this.popupIndex);
      } else if (e.keyCode === monaco.KeyCode.UpArrow) {
        e.preventDefault();
        e.stopPropagation();
        this.popupIndex = Math.max(0, this.popupIndex - 1);
        this.renderPopupHighlight();
      } else if (e.keyCode === monaco.KeyCode.DownArrow) {
        e.preventDefault();
        e.stopPropagation();
        this.popupIndex = Math.min(this.popupItems.length - 1, this.popupIndex + 1);
        this.renderPopupHighlight();
      }
    });

    console.log('✅ /command popup initialized');
  }

  checkPopupTrigger(e) {
    if (!e.changes) return;

    for (const change of e.changes) {
      // Detect / typed at start of line
      if (change.text === '/') {
        const pos = this.editor.getPosition();
        const model = this.editor.getModel();
        const lineContent = model.getLineContent(pos.lineNumber).substring(0, pos.column - 1);
        if (lineContent.trim() === '/') {
          this.popupAnchor = { lineNumber: pos.lineNumber, column: lineContent.indexOf('/') + 1 };
          this.popupMode = 'command';
          this.popupIndex = 0;
          this.updatePopupContent();
          return;
        }
      }
    }
  }

  updatePopupContent() {
    const pos = this.editor.getPosition();
    if (!pos || !this.popupAnchor) { this.hidePopup(); return; }

    // Check if cursor is still on the same line and after the anchor
    if (pos.lineNumber !== this.popupAnchor.lineNumber || pos.column < this.popupAnchor.column) {
      this.hidePopup();
      return;
    }

    const model = this.editor.getModel();
    const typed = model.getValueInRange({
      startLineNumber: this.popupAnchor.lineNumber,
      startColumn: this.popupAnchor.column,
      endLineNumber: pos.lineNumber,
      endColumn: pos.column
    });

    const query = typed.replace(/^\//, '').toLowerCase();
    const commands = [
      { label: '/lead', detail: 'Yeni Lead Oluştur', icon: '📊' },
      { label: '/task', detail: 'Yeni Görev Oluştur', icon: '✅' },
      { label: '/görev', detail: 'Yeni Görev Oluştur', icon: '✅' },
      { label: '/reminder', detail: 'Hatırlatıcı Ekle', icon: '🔔' },
      { label: '/hatırlat', detail: 'Hatırlatıcı Ekle', icon: '🔔' },
      { label: '/customer', detail: 'Müşteri Ata', icon: '👤' },
      { label: '/category', detail: 'Kategori Ata', icon: '🏷️' }
    ];
    this.popupItems = commands.filter(c =>
      !query || c.label.toLowerCase().includes(query)
    );

    if (this.popupItems.length === 0) {
      this.hidePopup();
      return;
    }

    this.popupIndex = Math.min(this.popupIndex, this.popupItems.length - 1);
    this.renderPopup();
    this.positionPopup();
  }

  renderPopup() {
    this.popup.innerHTML = this.popupItems.map((item, i) => `
      <div class="mention-popup-item ${i === this.popupIndex ? 'active' : ''}" data-popup-idx="${i}">
        <span class="pop-icon">${item.icon || ''}</span>
        <span class="pop-label">${item.label}</span>
        <span class="pop-detail">${item.detail || ''}</span>
      </div>
    `).join('');

    this.popup.classList.remove('hidden');

    // Click handlers
    this.popup.querySelectorAll('.mention-popup-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Don't steal focus from editor
        this.selectPopupItem(parseInt(el.dataset.popupIdx));
      });
      el.addEventListener('mouseenter', () => {
        this.popupIndex = parseInt(el.dataset.popupIdx);
        this.renderPopupHighlight();
      });
    });
  }

  renderPopupHighlight() {
    this.popup.querySelectorAll('.mention-popup-item').forEach((el, i) => {
      el.classList.toggle('active', i === this.popupIndex);
    });
    // Scroll active item into view
    const active = this.popup.querySelector('.mention-popup-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  positionPopup() {
    const pos = this.editor.getPosition();
    const coords = this.editor.getScrolledVisiblePosition(pos);
    if (!coords) { this.hidePopup(); return; }

    const editorDom = this.editor.getDomNode();
    const editorRect = editorDom.getBoundingClientRect();

    let top = editorRect.top + coords.top + coords.height + 2;
    let left = editorRect.left + coords.left;

    // Keep within viewport
    const popupHeight = this.popup.offsetHeight;
    if (top + popupHeight > window.innerHeight - 20) {
      top = editorRect.top + coords.top - popupHeight - 2;
    }

    this.popup.style.position = 'fixed';
    this.popup.style.top = top + 'px';
    this.popup.style.left = left + 'px';
  }

  selectPopupItem(index) {
    const item = this.popupItems[index];
    if (!item || !this.popupAnchor) { this.hidePopup(); return; }

    const pos = this.editor.getPosition();
    if (!pos) { this.hidePopup(); return; }

    // Save values BEFORE hidePopup/executeEdits (edits trigger content change → hidePopup)
    const anchor = { ...this.popupAnchor };

    // Hide popup first to prevent re-entry
    this.hidePopup();

    const range = new monaco.Range(anchor.lineNumber, anchor.column, pos.lineNumber, pos.column);
    this.editor.executeEdits('command', [{ range, text: item.label + ' ' }]);
    const cmd = item.label.replace('/', '');
    setTimeout(() => this.executeSlashCommand(this.mapCommandType(cmd)), 200);

    this.editor.focus();
  }

  mapCommandType(cmd) {
    const map = {
      'lead': 'lead', 'task': 'task', 'görev': 'task',
      'reminder': 'reminder', 'hatırlat': 'reminder',
      'customer': 'customer', 'müşteri': 'customer',
      'category': 'category', 'kategori': 'category'
    };
    return map[cmd] || cmd;
  }

  hidePopup() {
    this.popup.classList.add('hidden');
    this.popupMode = null;
    this.popupAnchor = null;
    this.popupItems = [];
  }

  checkForSlashCommand(e) {
    // Check if user just completed a /command line (pressed Enter after a slash command)
    if (!e.changes) return;
    for (const change of e.changes) {
      if (change.text === '\n' || change.text === '\r\n') {
        const model = this.editor.getModel();
        const lineNumber = change.range.startLineNumber;
        const lineContent = model.getLineContent(lineNumber).trim();

        if (lineContent.startsWith('/lead')) {
          this.executeSlashCommand('lead', lineContent);
        } else if (lineContent.startsWith('/task') || lineContent.startsWith('/görev')) {
          this.executeSlashCommand('task', lineContent);
        } else if (lineContent.startsWith('/reminder') || lineContent.startsWith('/hatırlat')) {
          this.executeSlashCommand('reminder', lineContent);
        } else if (lineContent.startsWith('/customer') || lineContent.startsWith('/müşteri')) {
          this.executeSlashCommand('customer', lineContent);
        } else if (lineContent.startsWith('/category') || lineContent.startsWith('/kategori')) {
          this.executeSlashCommand('category', lineContent);
        }
      }
    }
  }

  executeSlashCommand(type, lineContent) {
    const args = lineContent.replace(/^\/(lead|task|görev|reminder|hatırlat|customer|müşteri|category|kategori)\s*/i, '').trim();
    const tab = window.tabManager?.getActiveTab();

    // Try to find the @mentioned customer in the whole content
    const fullContent = this.getContent();
    const mentionedCustomers = window.notesManager?.extractMentions(fullContent) || [];
    const firstCustomerId = mentionedCustomers[0] || null;

    switch (type) {
      case 'lead':
        // Pre-fill lead from context
        setTimeout(() => {
          window.leadManager.showCreateModal({
            customerId: firstCustomerId,
            notes: args || fullContent.substring(0, 200)
          });
        }, 100);
        break;

      case 'task':
        setTimeout(() => {
          window.taskManager.showCreateModal({
            title: args || '',
            customerId: firstCustomerId,
            description: ''
          });
        }, 100);
        break;

      case 'reminder':
        setTimeout(() => {
          window.reminderManager.showCreateModal({
            title: args || '',
            customerId: firstCustomerId
          });
        }, 100);
        break;

      case 'customer':
        // Assign customer to current note
        if (tab?.noteId && window.notesManager) {
          this.showCustomerPicker(tab.noteId);
        }
        break;

      case 'category':
        // Assign category to current note
        if (tab?.noteId && window.notesManager) {
          this.showCategoryPicker(tab.noteId);
        }
        break;
    }
  }

  showCustomerPicker(noteId) {
    const customers = window.tagSystem?.customers || [];
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>Müşteri Ata</h3>
        <button class="icon-btn" id="modal-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="quick-pick-list">
          ${customers.map(c => `<button class="quick-pick-item" data-pick-customer="${c.id}">${c.name}<span class="qp-sub">${c.contact || ''}</span></button>`).join('')}
        </div>
      </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-close').addEventListener('click', () => document.getElementById('modal-overlay').classList.add('hidden'));
    modal.querySelectorAll('[data-pick-customer]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await window.notesManager.updateNote(noteId, { customerId: btn.dataset.pickCustomer });
        window.tabManager.updateNoteMetaDisplay();
        document.getElementById('modal-overlay').classList.add('hidden');
        showToast(`Müşteri atandı: ${btn.textContent}`, 'success');
      });
    });
  }

  showCategoryPicker(noteId) {
    const cats = window.tagSystem?.categories || [];
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>Kategori Ata</h3>
        <button class="icon-btn" id="modal-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="quick-pick-list">
          ${cats.map(c => `<button class="quick-pick-item" data-pick-cat="${c.id}"><span class="cat-color" style="background:${c.color}"></span>${c.name}</button>`).join('')}
        </div>
      </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-close').addEventListener('click', () => document.getElementById('modal-overlay').classList.add('hidden'));
    modal.querySelectorAll('[data-pick-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await window.notesManager.updateNote(noteId, { category: btn.dataset.pickCat });
        window.tabManager.updateNoteMetaDisplay();
        document.getElementById('modal-overlay').classList.add('hidden');
        showToast('Kategori atandı', 'success');
      });
    });
  }

  getModel(tabId) {
    return this.models.get(tabId);
  }

  createModel(tabId, content = '', language = 'plaintext') {
    const model = monaco.editor.createModel(content, language);
    this.models.set(tabId, model);
    return model;
  }

  switchToTab(tabId) {
    const model = this.models.get(tabId);
    if (model) {
      this.editor.setModel(model);
      this.currentTabId = tabId;
      this.updateWordCount();
      this.updateLanguageStatus(model);
    }
  }

  removeModel(tabId) {
    const model = this.models.get(tabId);
    if (model) {
      model.dispose();
      this.models.delete(tabId);
    }
  }

  setContent(tabId, content) {
    const model = this.models.get(tabId);
    if (model) {
      model.setValue(content);
    }
  }

  getContent(tabId) {
    const model = this.models.get(tabId || this.currentTabId);
    return model ? model.getValue() : '';
  }

  setLanguage(tabId, language) {
    const model = this.models.get(tabId);
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }

  detectLanguage(filePath) {
    if (!filePath) return 'plaintext';
    const ext = filePath.split('.').pop().toLowerCase();
    const langMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', rb: 'ruby', java: 'java', cs: 'csharp',
      cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
      html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
      json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
      md: 'markdown', sql: 'sql', sh: 'shell', bat: 'bat',
      php: 'php', go: 'go', rs: 'rust', swift: 'swift',
      txt: 'plaintext', log: 'plaintext', csv: 'plaintext',
    };
    return langMap[ext] || 'plaintext';
  }

  updateWordCount() {
    const content = this.editor?.getModel()?.getValue() || '';
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    document.getElementById('status-word-count').textContent = 
      `${words} ${window.i18n.t('words')}, ${chars} ${window.i18n.t('characters')}`;
  }

  updateLanguageStatus(model) {
    const lang = model ? model.getLanguageId() : 'plaintext';
    const displayNames = {
      javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
      html: 'HTML', css: 'CSS', json: 'JSON', markdown: 'Markdown',
      plaintext: 'Plain Text', xml: 'XML', yaml: 'YAML', sql: 'SQL',
    };
    document.getElementById('status-language').textContent = displayNames[lang] || lang;
  }

  setTheme(theme) {
    monaco.editor.setTheme(theme === 'dark' ? 'notepad-dark' : 'notepad-light');
  }

  setFontSize(size) {
    this.editor.updateOptions({ fontSize: size });
  }

  setFontFamily(family) {
    this.editor.updateOptions({ fontFamily: family });
  }

  setMinimap(enabled) {
    this.editor.updateOptions({ minimap: { enabled } });
  }

  focus() {
    this.editor?.focus();
  }

  // Find/Replace
  openFind() {
    this.editor.getAction('actions.find')?.run();
  }

  openReplace() {
    this.editor.getAction('editor.action.startFindReplaceAction')?.run();
  }
}

window.editorManager = new EditorManager();
