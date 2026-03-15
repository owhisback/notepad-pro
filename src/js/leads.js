/* ═══════════════════════════════════════════════════ 
   LEADS — Sales lead tracking
   ═══════════════════════════════════════════════════ */

class LeadManager {
  constructor() {
    this.leads = [];
    this.filterStatus = 'all';
  }

  async init() {
    this.leads = await window.dataStore.getLeads();
    
    document.getElementById('btn-new-lead').addEventListener('click', () => this.showCreateModal());
    document.getElementById('lead-filter-status').addEventListener('change', (e) => {
      this.filterStatus = e.target.value;
      this.render();
    });

    this.render();
  }

  getFilteredLeads() {
    if (this.filterStatus === 'all') return this.leads;
    return this.leads.filter(l => l.status === this.filterStatus);
  }

  render() {
    const container = document.getElementById('leads-list');
    const filtered = this.getFilteredLeads();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <h3>${window.i18n.t('no_leads')}</h3>
          <p>${window.i18n.t('no_leads_desc')}</p>
        </div>
      `;
      return;
    }

    // Stats
    const total = this.leads.length;
    const active = this.leads.filter(l => !['won', 'lost'].includes(l.status)).length;
    const won = this.leads.filter(l => l.status === 'won').length;

    const statsHtml = `
      <div class="leads-stats">
        <div class="lead-stat">
          <span class="lead-stat-value">${total}</span>
          <span class="lead-stat-label">${window.i18n.t('total_leads')}</span>
        </div>
        <div class="lead-stat">
          <span class="lead-stat-value">${active}</span>
          <span class="lead-stat-label">${window.i18n.t('active_leads')}</span>
        </div>
        <div class="lead-stat">
          <span class="lead-stat-value">${won}</span>
          <span class="lead-stat-label">${window.i18n.t('won_leads')}</span>
        </div>
      </div>
    `;

    const statusLabels = {
      new: window.i18n.t('status_new'),
      quoted: window.i18n.t('status_quoted'),
      pending: window.i18n.t('status_pending'),
      won: window.i18n.t('status_won'),
      lost: window.i18n.t('status_lost')
    };

    const leadsHtml = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(lead => {
        const customer = window.tagSystem.getCustomerById(lead.customerId);
        return `
          <div class="lead-card" data-lead-id="${lead.id}">
            <div class="lead-customer">
              <div class="lead-customer-name">${customer?.name || '—'}</div>
              <div class="lead-customer-contact">${customer?.contact || ''}</div>
            </div>
            <div class="lead-route">
              <span>${lead.origin || '—'}</span>
              <span class="arrow">→</span>
              <span>${lead.destination || '—'}</span>
            </div>
            <div class="lead-cargo">${lead.cargoType || ''} ${lead.weight ? lead.weight + ' kg' : ''}</div>
            <div class="lead-price">${lead.price ? '$' + lead.price : '—'}</div>
            <div class="lead-date">${this.formatDate(lead.createdAt)}</div>
            <div class="lead-status">
              <span class="status-badge ${lead.status}">${statusLabels[lead.status] || lead.status}</span>
            </div>
            <div class="lead-actions">
              <button class="icon-btn" data-lead-edit="${lead.id}" title="${window.i18n.t('edit')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn" data-lead-delete="${lead.id}" title="${window.i18n.t('delete')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join('');

    container.innerHTML = statsHtml + '<div style="padding:16px 24px">' + leadsHtml + '</div>';
    this.bindEvents(container);
  }

  bindEvents(container) {
    container.querySelectorAll('[data-lead-edit]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const lead = this.leads.find(l => l.id === el.dataset.leadEdit);
        if (lead) this.showCreateModal(lead);
      });
    });

    container.querySelectorAll('[data-lead-delete]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.leads = this.leads.filter(l => l.id !== el.dataset.leadDelete);
        await this.saveLeads();
        this.render();
      });
    });
  }

  showCreateModal(existing = null) {
    const isEdit = !!existing;
    const modal = document.getElementById('modal-container');

    modal.innerHTML = `
      <div class="modal-header">
        <h3>${isEdit ? window.i18n.t('edit') : window.i18n.t('new_lead')}</h3>
        <button class="icon-btn" id="modal-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>${window.i18n.t('customer')}</label>
          <select id="lead-input-customer">${window.tagSystem.renderCustomerSelect(existing?.customerId)}</select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${window.i18n.t('origin')}</label>
            <input type="text" id="lead-input-origin" value="${existing?.origin || ''}" placeholder="IST">
          </div>
          <div class="form-group">
            <label>${window.i18n.t('destination')}</label>
            <input type="text" id="lead-input-dest" value="${existing?.destination || ''}" placeholder="JFK">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${window.i18n.t('cargo_type')}</label>
            <input type="text" id="lead-input-cargotype" value="${existing?.cargoType || ''}" placeholder="General Cargo">
          </div>
          <div class="form-group">
            <label>${window.i18n.t('weight')}</label>
            <input type="number" id="lead-input-weight" value="${existing?.weight || ''}" placeholder="1000">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${window.i18n.t('price')}</label>
            <input type="text" id="lead-input-price" value="${existing?.price || ''}" placeholder="2.50">
          </div>
          <div class="form-group">
            <label>${window.i18n.t('status')}</label>
            <select id="lead-input-status">
              <option value="new" ${(existing?.status || 'new') === 'new' ? 'selected' : ''}>${window.i18n.t('status_new')}</option>
              <option value="quoted" ${existing?.status === 'quoted' ? 'selected' : ''}>${window.i18n.t('status_quoted')}</option>
              <option value="pending" ${existing?.status === 'pending' ? 'selected' : ''}>${window.i18n.t('status_pending')}</option>
              <option value="won" ${existing?.status === 'won' ? 'selected' : ''}>${window.i18n.t('status_won')}</option>
              <option value="lost" ${existing?.status === 'lost' ? 'selected' : ''}>${window.i18n.t('status_lost')}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>${window.i18n.t('notes')}</label>
          <textarea class="input-lg" id="lead-input-notes" placeholder="${window.i18n.t('notes')}">${existing?.notes || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">${window.i18n.t('cancel')}</button>
        <button class="btn-primary" id="modal-save">${window.i18n.t('save')}</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');

    document.getElementById('modal-save').addEventListener('click', async () => {
      const leadData = {
        id: existing?.id || window.dataStore.generateId(),
        customerId: document.getElementById('lead-input-customer').value || null,
        origin: document.getElementById('lead-input-origin').value.trim().toUpperCase(),
        destination: document.getElementById('lead-input-dest').value.trim().toUpperCase(),
        cargoType: document.getElementById('lead-input-cargotype').value.trim(),
        weight: document.getElementById('lead-input-weight').value || null,
        price: document.getElementById('lead-input-price').value || null,
        status: document.getElementById('lead-input-status').value,
        notes: document.getElementById('lead-input-notes').value.trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isEdit) {
        const idx = this.leads.findIndex(l => l.id === existing.id);
        if (idx >= 0) this.leads[idx] = leadData;
      } else {
        this.leads.push(leadData);
      }

      await this.saveLeads();
      this.closeModal();
      this.render();
    });

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
  }

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  async saveLeads() {
    await window.dataStore.saveLeads(this.leads);
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }

  getByCustomer(customerId) {
    return this.leads.filter(l => l.customerId === customerId);
  }

  getActiveCount() {
    return this.leads.filter(l => !['won', 'lost'].includes(l.status)).length;
  }
}

window.leadManager = new LeadManager();
