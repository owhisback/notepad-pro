/* ═══════════════════════════════════════════════════ 
   TASKS — Task board with detail view, notes, attachments
   ═══════════════════════════════════════════════════ */

class TaskManager {
  constructor() {
    this.tasks = [];
    this.filterCategory = 'all';
    this.filterStatus = 'all';
    this.filterCustomer = 'all';
    this.searchTerm = '';
    this.openTaskId = null; // currently open detail view
  }

  async init() {
    this.tasks = await window.dataStore.getTasks();
    
    document.getElementById('btn-new-task').addEventListener('click', () => this.showCreateModal());
    document.getElementById('task-filter-category').addEventListener('change', (e) => {
      this.filterCategory = e.target.value;
      this.render();
    });
    document.getElementById('task-filter-status').addEventListener('change', (e) => {
      this.filterStatus = e.target.value;
      this.render();
    });
    document.getElementById('task-filter-customer').addEventListener('change', (e) => {
      this.filterCustomer = e.target.value;
      this.render();
    });
    document.getElementById('task-search').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.render();
    });

    await this.updateCategoryFilter();
    await this.updateCustomerFilter();
    this.render();
  }

  async updateCategoryFilter() {
    const select = document.getElementById('task-filter-category');
    const settings = await window.dataStore.getSettings();
    select.innerHTML = `<option value="all">${window.i18n.t('all')}</option>` +
      (settings.categories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  async updateCustomerFilter() {
    const select = document.getElementById('task-filter-customer');
    const customers = await window.dataStore.getCustomers();
    select.innerHTML = `<option value="all">Tüm Müşteriler</option>` +
      customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  getFilteredTasks() {
    return this.tasks.filter(t => {
      if (this.filterCategory !== 'all' && t.category !== this.filterCategory) return false;
      if (this.filterStatus !== 'all' && t.status !== this.filterStatus) return false;
      if (this.filterCustomer !== 'all' && t.customerId !== this.filterCustomer) return false;
      if (this.searchTerm && !t.title.toLowerCase().includes(this.searchTerm) && 
          !(t.description || '').toLowerCase().includes(this.searchTerm)) return false;
      return true;
    });
  }

  render() {
    const container = document.getElementById('tasks-list');
    const filtered = this.getFilteredTasks();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <h3>${window.i18n.t('no_tasks')}</h3>
          <p>${window.i18n.t('no_tasks_desc')}</p>
        </div>
      `;
      return;
    }

    // Group by category
    const groups = {};
    filtered.forEach(t => {
      const cat = t.category || 'genel';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });

    container.innerHTML = Object.entries(groups).map(([catId, tasks]) => {
      const cat = window.tagSystem.getCategoryById(catId);
      return `
        <div class="task-category-group">
          <div class="task-category-header">
            <span class="cat-color" style="background:${cat?.color || '#636e72'}"></span>
            <span>${cat?.name || catId}</span>
            <span class="count">${tasks.length}</span>
          </div>
          ${tasks.sort((a, b) => {
            const ps = { high: 0, medium: 1, low: 2 };
            return (ps[a.priority] || 1) - (ps[b.priority] || 1);
          }).map(t => this.renderTaskCard(t)).join('')}
        </div>
      `;
    }).join('');

    this.bindTaskEvents(container);
  }

  renderTaskCard(task) {
    const checkClass = task.status === 'done' ? 'checked' : task.status === 'in-progress' ? 'in-progress' : '';
    const doneClass = task.status === 'done' ? 'done' : '';
    const attachCount = (task.attachments || []).length;
    const noteSnippet = task.notes ? task.notes.substring(0, 60) + (task.notes.length > 60 ? '...' : '') : '';

    return `
      <div class="task-card ${doneClass}" data-task-id="${task.id}">
        <div class="task-checkbox ${checkClass}" data-task-toggle="${task.id}"></div>
        <div class="task-content" data-task-open="${task.id}">
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
          <div class="task-meta">
            ${task.customerId ? window.tagSystem.renderCustomerTag(task.customerId) : ''}
            ${task.priority ? `<span class="task-meta-item"><span class="priority-dot ${task.priority}"></span> ${window.i18n.t(task.priority)}</span>` : ''}
            ${task.dueDate ? `<span class="task-meta-item">📅 ${this.formatDate(task.dueDate)}</span>` : ''}
            ${attachCount > 0 ? `<span class="task-meta-item">📎 ${attachCount}</span>` : ''}
            ${noteSnippet ? `<span class="task-meta-item task-note-preview">📝 ${noteSnippet}</span>` : ''}
          </div>
          ${task.checklist?.length ? this.renderChecklistPreview(task) : ''}
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-task-edit="${task.id}" title="${window.i18n.t('edit')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn" data-task-delete="${task.id}" title="${window.i18n.t('delete')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  renderChecklistPreview(task) {
    const completed = task.checklist.filter(i => i.done).length;
    return `<div class="task-checklist-preview"><span class="task-meta-item">✅ ${completed}/${task.checklist.length}</span></div>`;
  }

  bindTaskEvents(container) {
    // Toggle status
    container.querySelectorAll('[data-task-toggle]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const task = this.tasks.find(t => t.id === el.dataset.taskToggle);
        if (task) {
          const cycle = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' };
          task.status = cycle[task.status] || 'todo';
          await this.saveTasks();
          this.render();
        }
      });
    });

    // Open task detail
    container.querySelectorAll('[data-task-open]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-task-toggle]') || e.target.closest('[data-task-edit]') || e.target.closest('[data-task-delete]')) return;
        this.openTaskDetail(el.dataset.taskOpen);
      });
    });

    // Edit
    container.querySelectorAll('[data-task-edit]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const task = this.tasks.find(t => t.id === el.dataset.taskEdit);
        if (task) this.showCreateModal(task);
      });
    });

    // Delete
    container.querySelectorAll('[data-task-delete]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const task = this.tasks.find(t => t.id === el.dataset.taskDelete);
        if (!await showConfirm('Bu görevi silmek istediğinize emin misiniz?', task?.title)) return;
        if (task?.attachments) {
          for (const att of task.attachments) {
            await window.api.deleteAttachment(att.path);
          }
        }
        this.tasks = this.tasks.filter(t => t.id !== el.dataset.taskDelete);
        await this.saveTasks();
        this.render();
      });
    });
  }

  // ══════════════════════════════════════════════
  // TASK DETAIL VIEW
  // ══════════════════════════════════════════════
  openTaskDetail(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.openTaskId = taskId;

    // Hide task list, show detail
    document.getElementById('tasks-list').classList.add('hidden');
    document.getElementById('tasks-header').classList.add('hidden');
    const detail = document.getElementById('task-detail-container');
    detail.classList.remove('hidden');

    this.renderDetailView(task);
  }

  closeTaskDetail() {
    this.openTaskId = null;
    document.getElementById('tasks-list').classList.remove('hidden');
    document.getElementById('tasks-header').classList.remove('hidden');
    document.getElementById('task-detail-container').classList.add('hidden');
    this.render(); // refresh list
  }

  renderDetailView(task) {
    const container = document.getElementById('task-detail-container');
    const cat = window.tagSystem.getCategoryById(task.category);
    const statusLabels = { todo: window.i18n.t('todo'), 'in-progress': window.i18n.t('in_progress'), done: window.i18n.t('done') };
    const attachments = task.attachments || [];

    container.innerHTML = `
      <div class="task-detail">
        <!-- Header -->
        <div class="task-detail-header">
          <button class="btn-secondary task-detail-back" id="btn-task-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Geri
          </button>
          <h2 class="task-detail-title">${escapeHtml(task.title)}</h2>
          <div class="task-detail-actions">
            <button class="btn-secondary" id="btn-detail-edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Düzenle
            </button>
          </div>
        </div>

        <!-- Meta info -->
        <div class="task-detail-meta">
          <span class="status-badge ${task.status}">${statusLabels[task.status] || task.status}</span>
          ${cat ? `<span class="tag tag-category" style="background:${cat.color}20;color:${cat.color};border:1px solid ${cat.color}40">${cat.name}</span>` : ''}
          ${task.customerId ? window.tagSystem.renderCustomerTag(task.customerId) : ''}
          ${task.priority ? `<span class="task-meta-item"><span class="priority-dot ${task.priority}"></span> ${window.i18n.t(task.priority)}</span>` : ''}
          ${task.dueDate ? `<span class="task-meta-item">📅 ${this.formatDate(task.dueDate)}</span>` : ''}
        </div>

        ${task.description ? `<div class="task-detail-desc">${escapeHtml(task.description)}</div>` : ''}

        <!-- Two columns: Notes + Sidebar -->
        <div class="task-detail-body">
          <!-- Left column: Notes -->
          <div class="task-detail-left">
            <div class="task-detail-section">
              <h3>📝 Notlar</h3>
              <textarea class="task-notes-editor" id="task-notes-editor" placeholder="Bu görev hakkında notlarınızı yazın...">${task.notes || ''}</textarea>
              <button class="btn-primary" id="btn-save-notes" style="margin-top:8px;align-self:flex-end">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Notları Kaydet
              </button>
            </div>
          </div>

          <!-- Right column: Checklist + Attachments -->
          <div class="task-detail-right">
            ${task.checklist?.length ? `
              <div class="task-detail-section">
                <h3>✅ Kontrol Listesi</h3>
                <div class="task-detail-checklist" id="detail-checklist">
                  ${task.checklist.map((item, idx) => `
                    <div class="checklist-item ${item.done ? 'checked' : ''}">
                      <input type="checkbox" ${item.done ? 'checked' : ''} data-check-idx="${idx}">
                      <span>${item.text}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="task-detail-section">
              <div class="section-header-row">
                <h3>📎 Ekler</h3>
                <button class="btn-secondary" id="btn-add-attachment">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Dosya Ekle
                </button>
              </div>
              <div class="attachments-list" id="detail-attachments">
                ${attachments.length === 0 ? '<p class="no-attachments">Henüz ek dosya yok</p>' : ''}
                ${attachments.map(att => `
                  <div class="attachment-item" data-att-id="${att.id}">
                    <div class="attachment-icon">${this.getFileIcon(att.name)}</div>
                    <div class="attachment-info">
                      <span class="attachment-name" data-att-open="${att.path}">${att.name}</span>
                      <span class="attachment-size">${this.formatFileSize(att.size)}</span>
                    </div>
                    <button class="icon-btn" data-att-delete="${att.id}" title="Sil">
                      <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindDetailEvents(task);
  }

  bindDetailEvents(task) {
    // Back button
    document.getElementById('btn-task-back').addEventListener('click', () => this.closeTaskDetail());

    // Edit button
    document.getElementById('btn-detail-edit')?.addEventListener('click', () => this.showCreateModal(task));

    // Save notes
    document.getElementById('btn-save-notes').addEventListener('click', async () => {
      task.notes = document.getElementById('task-notes-editor').value;
      task.updatedAt = new Date().toISOString();
      await this.saveTasks();
      showToast('Notlar kaydedildi', 'success');
    });

    // Auto-save notes on Ctrl+S when in detail
    document.getElementById('task-notes-editor').addEventListener('keydown', async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        task.notes = e.target.value;
        task.updatedAt = new Date().toISOString();
        await this.saveTasks();
        showToast('Notlar kaydedildi', 'success');
      }
    });

    // Checklist toggles
    document.querySelectorAll('#detail-checklist [data-check-idx]').forEach(el => {
      el.addEventListener('change', async () => {
        const idx = parseInt(el.dataset.checkIdx);
        if (task.checklist?.[idx] !== undefined) {
          task.checklist[idx].done = el.checked;
          el.closest('.checklist-item').classList.toggle('checked', el.checked);
          await this.saveTasks();
        }
      });
    });

    // Add attachment
    document.getElementById('btn-add-attachment').addEventListener('click', async () => {
      const files = await window.api.pickAttachments();
      if (files.length > 0) {
        if (!task.attachments) task.attachments = [];
        task.attachments.push(...files);
        task.updatedAt = new Date().toISOString();
        await this.saveTasks();
        this.renderDetailView(task); // re-render
        showToast(`${files.length} dosya eklendi`, 'success');
      }
    });

    // Open attachment
    document.querySelectorAll('[data-att-open]').forEach(el => {
      el.addEventListener('click', () => {
        window.api.openAttachment(el.dataset.attOpen);
      });
    });

    // Delete attachment
    document.querySelectorAll('[data-att-delete]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const attId = el.dataset.attDelete;
        const att = task.attachments?.find(a => a.id === attId);
        if (att) {
          await window.api.deleteAttachment(att.path);
          task.attachments = task.attachments.filter(a => a.id !== attId);
          task.updatedAt = new Date().toISOString();
          await this.saveTasks();
          this.renderDetailView(task);
          showToast('Dosya silindi', 'info');
        }
      });
    });
  }

  // ══════════════════════════════════════════════
  // CREATE/EDIT MODAL
  // ══════════════════════════════════════════════
  showCreateModal(existing = null) {
    const isEdit = !!existing;
    const modal = document.getElementById('modal-container');
    
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${isEdit ? window.i18n.t('edit') : window.i18n.t('new_task')}</h3>
        <button class="icon-btn" id="modal-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>${window.i18n.t('task_title')}</label>
          <input type="text" id="task-input-title" value="${escapeHtml(existing?.title || '')}" placeholder="${window.i18n.t('task_title')}">
        </div>
        <div class="form-group">
          <label>${window.i18n.t('task_desc')}</label>
          <textarea class="input-lg" id="task-input-desc" placeholder="${window.i18n.t('task_desc')}">${escapeHtml(existing?.description || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${window.i18n.t('category')}</label>
            <select id="task-input-category">${window.tagSystem.renderCategorySelect(existing?.category)}</select>
          </div>
          <div class="form-group">
            <label>${window.i18n.t('priority')}</label>
            <select id="task-input-priority">
              <option value="low" ${existing?.priority === 'low' ? 'selected' : ''}>${window.i18n.t('low')}</option>
              <option value="medium" ${(!existing || existing?.priority === 'medium') ? 'selected' : ''}>${window.i18n.t('medium')}</option>
              <option value="high" ${existing?.priority === 'high' ? 'selected' : ''}>${window.i18n.t('high')}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${window.i18n.t('customer')}</label>
            <select id="task-input-customer">${window.tagSystem.renderCustomerSelect(existing?.customerId)}</select>
          </div>
          <div class="form-group">
            <label>${window.i18n.t('due_date')}</label>
            <input type="date" id="task-input-due" value="${existing?.dueDate || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>${window.i18n.t('checklist')}</label>
          <div id="task-checklist-container">
            ${(existing?.checklist || []).map((item, idx) => `
              <div class="checklist-item" style="margin-bottom:4px">
                <input type="checkbox" ${item.done ? 'checked' : ''} class="check-done" data-idx="${idx}">
                <input type="text" class="input-sm check-text" value="${escapeHtml(item.text)}" style="flex:1">
                <button class="icon-btn check-remove" data-idx="${idx}">✕</button>
              </div>
            `).join('')}
          </div>
          <button class="btn-secondary" id="btn-add-checklist-item" style="margin-top:6px">${window.i18n.t('add_item')}</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">${window.i18n.t('cancel')}</button>
        <button class="btn-primary" id="modal-save">${window.i18n.t('save')}</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');

    // Add checklist item
    document.getElementById('btn-add-checklist-item').addEventListener('click', () => {
      const container = document.getElementById('task-checklist-container');
      const div = document.createElement('div');
      div.className = 'checklist-item';
      div.style.marginBottom = '4px';
      div.innerHTML = `
        <input type="checkbox" class="check-done">
        <input type="text" class="input-sm check-text" placeholder="${window.i18n.t('add_item')}" style="flex:1">
        <button class="icon-btn check-remove">✕</button>
      `;
      container.appendChild(div);
      div.querySelector('.check-text').focus();
      div.querySelector('.check-remove').addEventListener('click', () => div.remove());
    });

    // Remove existing checklist items
    document.querySelectorAll('.check-remove').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.checklist-item').remove());
    });

    // Save
    document.getElementById('modal-save').addEventListener('click', async () => {
      const title = document.getElementById('task-input-title').value.trim();
      if (!title) return;

      const checklist = [];
      document.querySelectorAll('#task-checklist-container .checklist-item').forEach(el => {
        const text = el.querySelector('.check-text')?.value?.trim();
        const done = el.querySelector('.check-done')?.checked || false;
        if (text) checklist.push({ text, done });
      });

      const taskData = {
        id: existing?.id || window.dataStore.generateId(),
        title,
        description: document.getElementById('task-input-desc').value.trim(),
        category: document.getElementById('task-input-category').value,
        priority: document.getElementById('task-input-priority').value,
        customerId: document.getElementById('task-input-customer').value || null,
        dueDate: document.getElementById('task-input-due').value || null,
        status: existing?.status || 'todo',
        checklist,
        notes: existing?.notes || '',
        attachments: existing?.attachments || [],
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isEdit) {
        const idx = this.tasks.findIndex(t => t.id === existing.id);
        if (idx >= 0) this.tasks[idx] = taskData;
      } else {
        this.tasks.push(taskData);
      }

      await this.saveTasks();
      this.closeModal();
      
      // If we're in detail view, refresh it
      if (this.openTaskId && isEdit) {
        const updated = this.tasks.find(t => t.id === existing.id);
        if (updated) this.renderDetailView(updated);
      } else {
        this.render();
      }
    });

    // Close
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('task-input-title').focus();
  }

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  async saveTasks() {
    await window.dataStore.saveTasks(this.tasks);
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }

  formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄', doc: '📃', docx: '📃', xls: '📊', xlsx: '📊',
      ppt: '📑', pptx: '📑', txt: '📝', csv: '📊',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', bmp: '🖼️',
      zip: '📦', rar: '📦', '7z': '📦',
      mp4: '🎬', avi: '🎬', mov: '🎬',
      mp3: '🎵', wav: '🎵'
    };
    return icons[ext] || '📎';
  }

  // Get tasks by customer
  getByCustomer(customerId) {
    return this.tasks.filter(t => t.customerId === customerId);
  }

  getActiveCount() {
    return this.tasks.filter(t => t.status !== 'done').length;
  }
}

window.taskManager = new TaskManager();
