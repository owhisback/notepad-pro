/* ═══════════════════════════════════════════════════ 
   CUSTOMERS — Mini CRM with detail view
   ═══════════════════════════════════════════════════ */

class CustomerManager {
  constructor() {
    this.customers = [];
    this.searchTerm = '';
    this.detailCustomerId = null;
  }

  async init() {
    this.customers = await window.dataStore.getCustomers();
    
    document.getElementById('btn-new-customer').addEventListener('click', () => this.showCreateModal());
    document.getElementById('customer-search').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.render();
    });

    this.render();
  }

  getFilteredCustomers() {
    if (!this.searchTerm) return this.customers;
    return this.customers.filter(c => 
      c.name.toLowerCase().includes(this.searchTerm) ||
      c.contact?.toLowerCase().includes(this.searchTerm)
    );
  }

  render() {
    const container = document.getElementById('customers-grid');
    const filtered = this.getFilteredCustomers();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          </svg>
          <h3>${window.i18n.t('no_customers')}</h3>
          <p>${window.i18n.t('no_customers_desc')}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(customer => {
      const initials = customer.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const taskCount = window.taskManager?.getByCustomer(customer.id).length || 0;
      const leadCount = window.leadManager?.getByCustomer(customer.id).length || 0;
      const noteCount = window.notesManager?.getByCustomer(customer.id).length || 0;
      const activeLeads = window.leadManager?.getByCustomer(customer.id).filter(l => !['won','lost'].includes(l.status)).length || 0;

      return `
        <div class="customer-card" data-customer-id="${customer.id}">
          <div class="customer-card-compact">
            <div class="customer-avatar">${initials}</div>
            <div class="customer-info">
              <h3>${customer.name}</h3>
              <p>${customer.contact || ''}</p>
            </div>
            <div class="customer-mini-stats">
              <span title="Görev">✅${taskCount}</span>
              <span title="Lead">📊${activeLeads}</span>
            </div>
          </div>
          <div class="customer-card-expanded">
            <div class="customer-contact">
              ${customer.email ? `
                <div class="customer-contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span>${customer.email}</span>
                </div>` : ''}
              ${customer.phone ? `
                <div class="customer-contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/></svg>
                  <span>${customer.phone}</span>
                </div>` : ''}
            </div>
            <div class="customer-stats">
              <span class="customer-stat">📝 <span class="count">${noteCount}</span> not</span>
              <span class="customer-stat">✅ <span class="count">${taskCount}</span> görev</span>
              <span class="customer-stat">📊 <span class="count">${activeLeads}</span> lead</span>
            </div>
            <div class="customer-actions">
              <button class="btn-secondary btn-sm" data-customer-view="${customer.id}">Detay</button>
              <button class="icon-btn" data-customer-edit="${customer.id}" title="${window.i18n.t('edit')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn" data-customer-delete="${customer.id}" title="${window.i18n.t('delete')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.bindEvents(container);
  }

  bindEvents(container) {
    // View detail
    container.querySelectorAll('[data-customer-view]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDetail(el.dataset.customerView);
      });
    });

    // Card click toggles expanded
    container.querySelectorAll('.customer-card').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-customer-edit]') || e.target.closest('[data-customer-delete]') || e.target.closest('[data-customer-view]')) return;
        el.classList.toggle('expanded');
      });
    });

    container.querySelectorAll('[data-customer-edit]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const customer = this.customers.find(c => c.id === el.dataset.customerEdit);
        if (customer) this.showCreateModal(customer);
      });
    });

    container.querySelectorAll('[data-customer-delete]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.customers = this.customers.filter(c => c.id !== el.dataset.customerDelete);
        await this.saveCustomers();
        await window.tagSystem.refreshCustomers();
        this.render();
      });
    });
  }

  // ══════════════════════════════════════════════
  // CUSTOMER DETAIL VIEW
  // ══════════════════════════════════════════════
  openDetail(customerId) {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) return;
    this.detailCustomerId = customerId;

    document.getElementById('customers-grid').classList.add('hidden');
    document.getElementById('customers-header').classList.add('hidden');
    const detail = document.getElementById('customer-detail-container');
    detail.classList.remove('hidden');

    this.renderDetail(customer);
  }

  closeDetail() {
    this.detailCustomerId = null;
    document.getElementById('customers-grid').classList.remove('hidden');
    document.getElementById('customers-header').classList.remove('hidden');
    document.getElementById('customer-detail-container').classList.add('hidden');
    this.render();
  }

  renderDetail(customer) {
    const container = document.getElementById('customer-detail-container');
    const initials = customer.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    // Get related items
    const notes = window.notesManager?.getByCustomer(customer.id) || [];
    const tasks = window.taskManager?.getByCustomer(customer.id) || [];
    const leads = window.leadManager?.getByCustomer(customer.id) || [];

    const statusLabels = {
      new: 'Yeni', quoted: 'Teklif Verildi', pending: 'Beklemede', won: 'Kazanıldı', lost: 'Kaybedildi',
      todo: 'Yapılacak', 'in-progress': 'Devam Ediyor', done: 'Tamamlandı'
    };

    container.innerHTML = `
      <div class="customer-detail">
        <!-- Header -->
        <div class="cd-header">
          <button class="btn-secondary" id="btn-customer-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Geri
          </button>
          <div class="cd-avatar-lg">${initials}</div>
          <div class="cd-info">
            <h2>${customer.name}</h2>
            <p>${customer.contact || ''}</p>
            <div class="cd-contact-row">
              ${customer.email ? `<span>📧 ${customer.email}</span>` : ''}
              ${customer.phone ? `<span>📞 ${customer.phone}</span>` : ''}
            </div>
          </div>
          <button class="btn-secondary" id="btn-cd-edit">Düzenle</button>
        </div>

        <!-- Quick info / Key notes -->
        <div class="cd-section cd-key-info">
          <div class="cd-section-header">
            <h3>📌 Temel Bilgiler & Notlar</h3>
            <button class="btn-secondary btn-sm" id="btn-cd-edit-keynotes">Düzenle</button>
          </div>
          <div class="cd-keynotes-content" id="cd-keynotes-display">
            ${customer.keyNotes ? customer.keyNotes.replace(/\n/g, '<br>') : '<span style="color:var(--text-tertiary)">Anlaşma fiyatları, draft tarifeler, önemli bilgiler buraya yazılabilir...</span>'}
          </div>
          <div class="cd-keynotes-edit hidden" id="cd-keynotes-editor">
            <textarea class="cd-keynotes-textarea" id="cd-keynotes-textarea" placeholder="Güncel anlaşma fiyatları, draft tarifeler, önemli bilgiler...">${customer.keyNotes || ''}</textarea>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn-primary btn-sm" id="btn-cd-save-keynotes">Kaydet</button>
              <button class="btn-secondary btn-sm" id="btn-cd-cancel-keynotes">İptal</button>
            </div>
          </div>
        </div>

        <!-- Tabs: Notes / Tasks / Leads -->
        <div class="cd-tabs">
          <button class="cd-tab active" data-cd-tab="notes">📝 Notlar <span class="count">${notes.length}</span></button>
          <button class="cd-tab" data-cd-tab="tasks">✅ Görevler <span class="count">${tasks.length}</span></button>
          <button class="cd-tab" data-cd-tab="leads">📊 Leads <span class="count">${leads.length}</span></button>
        </div>

        <!-- Tab contents -->
        <div class="cd-tab-content" id="cd-tab-notes">
          ${notes.length === 0 ? '<p class="cd-empty">Bu müşteriye ait not bulunmuyor. Editörde <code>@${customer.name}</code> yazarak not etiketleyebilirsiniz.</p>' : ''}
          ${notes.map(note => {
            const cat = note.category ? window.tagSystem.getCategoryById(note.category) : null;
            const preview = (note.content || '').substring(0, 150).replace(/\n/g, ' ');
            return `
              <div class="cd-item cd-note-item" data-open-note="${note.id}">
                <div class="cd-item-header">
                  <span class="cd-item-title">${note.title}</span>
                  ${cat ? `<span class="note-meta-tag" style="background:${cat.color}20;color:${cat.color};border:1px solid ${cat.color}40">${cat.name}</span>` : ''}
                  <span class="cd-item-date">${this.formatDate(note.updatedAt)}</span>
                </div>
                <p class="cd-item-preview">${preview || 'Boş not'}</p>
              </div>
            `;
          }).join('')}
        </div>

        <div class="cd-tab-content hidden" id="cd-tab-tasks">
          ${tasks.length === 0 ? '<p class="cd-empty">Bu müşteriye ait görev bulunmuyor.</p>' : ''}
          ${tasks.map(task => `
            <div class="cd-item">
              <div class="cd-item-header">
                <span class="status-badge ${task.status}">${statusLabels[task.status] || task.status}</span>
                <span class="cd-item-title">${task.title}</span>
                ${task.dueDate ? `<span class="cd-item-date">📅 ${this.formatDate(task.dueDate)}</span>` : ''}
              </div>
              ${task.description ? `<p class="cd-item-preview">${task.description}</p>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="cd-tab-content hidden" id="cd-tab-leads">
          ${leads.length === 0 ? '<p class="cd-empty">Bu müşteriye ait lead bulunmuyor.</p>' : ''}
          ${leads.map(lead => `
            <div class="cd-item">
              <div class="cd-item-header">
                <span class="status-badge ${lead.status}">${statusLabels[lead.status] || lead.status}</span>
                <span class="cd-item-title">${lead.origin || '—'} → ${lead.destination || '—'}</span>
                <span class="cd-item-date">${lead.price ? '$' + lead.price : ''} ${lead.weight ? lead.weight + ' kg' : ''}</span>
              </div>
              <p class="cd-item-preview">${lead.cargoType || ''} ${lead.notes ? '• ' + lead.notes.substring(0, 80) : ''}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.bindDetailEvents(customer);
  }

  bindDetailEvents(customer) {
    // Back
    document.getElementById('btn-customer-back').addEventListener('click', () => this.closeDetail());

    // Edit customer
    document.getElementById('btn-cd-edit').addEventListener('click', () => this.showCreateModal(customer));

    // Key notes edit
    document.getElementById('btn-cd-edit-keynotes').addEventListener('click', () => {
      document.getElementById('cd-keynotes-display').classList.add('hidden');
      document.getElementById('cd-keynotes-editor').classList.remove('hidden');
    });

    document.getElementById('btn-cd-save-keynotes').addEventListener('click', async () => {
      customer.keyNotes = document.getElementById('cd-keynotes-textarea').value;
      customer.updatedAt = new Date().toISOString();
      const idx = this.customers.findIndex(c => c.id === customer.id);
      if (idx >= 0) this.customers[idx] = customer;
      await this.saveCustomers();
      this.renderDetail(customer);
      showToast('Bilgiler kaydedildi', 'success');
    });

    document.getElementById('btn-cd-cancel-keynotes')?.addEventListener('click', () => {
      document.getElementById('cd-keynotes-display').classList.remove('hidden');
      document.getElementById('cd-keynotes-editor').classList.add('hidden');
    });

    // Tab switching
    document.querySelectorAll('.cd-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cd-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cd-tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`cd-tab-${tab.dataset.cdTab}`).classList.remove('hidden');
      });
    });

    // Open note in editor
    document.querySelectorAll('[data-open-note]').forEach(el => {
      el.addEventListener('click', () => {
        // Switch to editor module and open note
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-module="editor"]').classList.add('active');
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        document.getElementById('module-editor').classList.add('active');
        
        window.tabManager.openExistingNote(el.dataset.openNote);
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
        <h3>${isEdit ? window.i18n.t('edit') : window.i18n.t('new_customer')}</h3>
        <button class="icon-btn" id="modal-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>${window.i18n.t('company_name')}</label>
          <input type="text" id="cust-input-name" value="${existing?.name || ''}" placeholder="${window.i18n.t('company_name')}">
        </div>
        <div class="form-group">
          <label>${window.i18n.t('contact_person')}</label>
          <input type="text" id="cust-input-contact" value="${existing?.contact || ''}" placeholder="${window.i18n.t('contact_person')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${window.i18n.t('email')}</label>
            <input type="email" id="cust-input-email" value="${existing?.email || ''}" placeholder="email@example.com">
          </div>
          <div class="form-group">
            <label>${window.i18n.t('phone')}</label>
            <input type="tel" id="cust-input-phone" value="${existing?.phone || ''}" placeholder="+90 555 000 0000">
          </div>
        </div>
        <div class="form-group">
          <label>${window.i18n.t('customer_note')}</label>
          <textarea class="input-lg" id="cust-input-note" placeholder="${window.i18n.t('customer_note')}">${existing?.note || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">${window.i18n.t('cancel')}</button>
        <button class="btn-primary" id="modal-save">${window.i18n.t('save')}</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');

    document.getElementById('modal-save').addEventListener('click', async () => {
      const name = document.getElementById('cust-input-name').value.trim();
      if (!name) return;

      const data = {
        id: existing?.id || window.dataStore.generateId(),
        name,
        contact: document.getElementById('cust-input-contact').value.trim(),
        email: document.getElementById('cust-input-email').value.trim(),
        phone: document.getElementById('cust-input-phone').value.trim(),
        note: document.getElementById('cust-input-note').value.trim(),
        keyNotes: existing?.keyNotes || '',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isEdit) {
        const idx = this.customers.findIndex(c => c.id === existing.id);
        if (idx >= 0) this.customers[idx] = data;
      } else {
        this.customers.push(data);
      }

      await this.saveCustomers();
      await window.tagSystem.refreshCustomers();
      this.closeModal();
      
      if (this.detailCustomerId === data.id) {
        this.renderDetail(data);
      } else {
        this.render();
      }
    });

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('cust-input-name').focus();
  }

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  async saveCustomers() {
    await window.dataStore.saveCustomers(this.customers);
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }
}

window.customerManager = new CustomerManager();
