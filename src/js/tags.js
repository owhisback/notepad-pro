/* ═══════════════════════════════════════════════════ 
   TAGS — Tagging system for customers & categories
   ═══════════════════════════════════════════════════ */

class TagSystem {
  constructor() {
    this.customers = [];
    this.categories = [];
  }

  async init() {
    this.customers = await window.dataStore.getCustomers();
    const settings = await window.dataStore.getSettings();
    this.categories = settings.categories || [];
  }

  getCustomerById(id) {
    return this.customers.find(c => c.id === id);
  }

  getCustomerName(id) {
    const c = this.getCustomerById(id);
    return c ? c.name : '';
  }

  getCategoryById(id) {
    return this.categories.find(c => c.id === id);
  }

  getCategoryName(id) {
    const c = this.getCategoryById(id);
    return c ? c.name : '';
  }

  renderCustomerTag(customerId) {
    if (!customerId) return '';
    const customer = this.getCustomerById(customerId);
    if (!customer) return '';
    return `<span class="tag tag-customer" data-customer-id="${customerId}">👤 ${customer.name}</span>`;
  }

  renderCategoryTag(categoryId) {
    if (!categoryId) return '';
    const cat = this.getCategoryById(categoryId);
    if (!cat) return '';
    return `<span class="tag tag-category" style="background:${cat.color}20;color:${cat.color};border:1px solid ${cat.color}40">${cat.name}</span>`;
  }

  renderCustomerSelect(selectedId = '', includeNone = true) {
    let html = '';
    if (includeNone) {
      html += `<option value="">${window.i18n.t('no_customer')}</option>`;
    }
    this.customers.forEach(c => {
      html += `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`;
    });
    return html;
  }

  renderCategorySelect(selectedId = '', includeAll = false) {
    let html = '';
    if (includeAll) {
      html += `<option value="all">${window.i18n.t('all')}</option>`;
    }
    this.categories.forEach(c => {
      html += `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`;
    });
    return html;
  }

  async refreshCustomers() {
    this.customers = await window.dataStore.getCustomers();
  }

  async refreshCategories() {
    const settings = await window.dataStore.getSettings();
    this.categories = settings.categories || [];
  }
}

window.tagSystem = new TagSystem();
