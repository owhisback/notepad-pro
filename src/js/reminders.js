/* ═══════════════════════════════════════════════════ 
   REMINDERS — Periodic & one-time notifications
   ═══════════════════════════════════════════════════ */

class ReminderManager {
  constructor() {
    this.reminders = [];
    this.filterMode = 'active';
    this.activePopups = [];
  }

  async init() {
    this.reminders = await window.dataStore.getReminders();
    
    document.getElementById('btn-new-reminder').addEventListener('click', () => this.showCreateModal());
    document.getElementById('reminder-filter').addEventListener('change', (e) => {
      this.filterMode = e.target.value;
      this.render();
    });

    // Listen for periodic check from main process
    window.api.onCheckReminders(() => this.checkDueReminders());

    this.render();
    this.updateBadge();
    
    // Initial check
    setTimeout(() => this.checkDueReminders(), 2000);
  }

  getFilteredReminders() {
    const now = new Date();
    return this.reminders.filter(r => {
      const dueDate = new Date(r.nextDue || r.dueDate);
      switch (this.filterMode) {
        case 'active': return !r.completed && dueDate >= now;
        case 'overdue': return !r.completed && dueDate < now;
        case 'completed': return r.completed;
        case 'all': return true;
        default: return true;
      }
    }).sort((a, b) => new Date(a.nextDue || a.dueDate) - new Date(b.nextDue || b.dueDate));
  }

  render() {
    const container = document.getElementById('reminders-list');
    const filtered = this.getFilteredReminders();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <h3>${window.i18n.t('no_reminders')}</h3>
          <p>${window.i18n.t('no_reminders_desc')}</p>
        </div>
      `;
      return;
    }

    const now = new Date();
    container.innerHTML = filtered.map(reminder => {
      const dueDate = new Date(reminder.nextDue || reminder.dueDate);
      const isOverdue = !reminder.completed && dueDate < now;
      const isUpcoming = !reminder.completed && !isOverdue && (dueDate - now) < 3600000; // 1 hour
      
      const repeatLabels = {
        none: '', daily: window.i18n.t('daily'), 
        weekly: window.i18n.t('weekly'), monthly: window.i18n.t('monthly')
      };
      const customerTag = reminder.customerId ? window.tagSystem.renderCustomerTag(reminder.customerId) : '';

      return `
        <div class="reminder-card ${isOverdue ? 'overdue' : ''} ${isUpcoming ? 'upcoming' : ''} ${reminder.completed ? 'completed' : ''}" data-reminder-id="${reminder.id}">
          <div class="reminder-icon ${reminder.repeat && reminder.repeat !== 'none' ? 'periodic' : 'once'}">
            ${reminder.repeat && reminder.repeat !== 'none' ? '🔄' : '🔔'}
          </div>
          <div class="reminder-content">
            <div class="reminder-title">${reminder.title}</div>
            <div class="reminder-time ${isOverdue ? 'overdue' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>${this.formatDateTime(dueDate)}</span>
              ${isOverdue ? ' — Süresi geçti!' : ''}
            </div>
            ${reminder.repeat && reminder.repeat !== 'none' ? `<div class="reminder-repeat">🔄 ${repeatLabels[reminder.repeat]}</div>` : ''}
            ${customerTag ? `<div style="margin-top:4px">${customerTag}</div>` : ''}
          </div>
          <div class="reminder-actions">
            ${!reminder.completed ? `
              <button class="icon-btn" data-reminder-done="${reminder.id}" title="${window.i18n.t('mark_done')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg>
              </button>
              <button class="icon-btn" data-reminder-snooze="${reminder.id}" title="${window.i18n.t('snooze')}" style="position:relative">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </button>
            ` : ''}
            <button class="icon-btn" data-reminder-edit="${reminder.id}" title="${window.i18n.t('edit')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn" data-reminder-delete="${reminder.id}" title="${window.i18n.t('delete')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.bindEvents(container);
  }

  bindEvents(container) {
    container.querySelectorAll('[data-reminder-done]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.markDone(el.dataset.reminderDone);
      });
    });

    container.querySelectorAll('[data-reminder-snooze]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSnoozeDropdown(el, el.dataset.reminderSnooze);
      });
    });

    container.querySelectorAll('[data-reminder-edit]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const reminder = this.reminders.find(r => r.id === el.dataset.reminderEdit);
        if (reminder) this.showCreateModal(reminder);
      });
    });

    container.querySelectorAll('[data-reminder-delete]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.reminders = this.reminders.filter(r => r.id !== el.dataset.reminderDelete);
        await this.saveReminders();
        this.render();
        this.updateBadge();
      });
    });
  }

  showSnoozeDropdown(anchor, reminderId) {
    // Remove any existing dropdown
    document.querySelectorAll('.snooze-dropdown').forEach(d => d.remove());

    const dropdown = document.createElement('div');
    dropdown.className = 'snooze-dropdown';
    dropdown.innerHTML = `
      <button class="snooze-option" data-snooze-mins="5">${window.i18n.t('snooze_5m')}</button>
      <button class="snooze-option" data-snooze-mins="15">${window.i18n.t('snooze_15m')}</button>
      <button class="snooze-option" data-snooze-mins="60">${window.i18n.t('snooze_1h')}</button>
      <button class="snooze-option" data-snooze-mins="1440">${window.i18n.t('snooze_tomorrow')}</button>
    `;

    anchor.style.position = 'relative';
    anchor.appendChild(dropdown);

    dropdown.querySelectorAll('.snooze-option').forEach(opt => {
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        const mins = parseInt(opt.dataset.snoozeMins);
        await this.snooze(reminderId, mins);
        dropdown.remove();
      });
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', () => dropdown.remove(), { once: true });
    }, 100);
  }

  async snooze(reminderId, mins) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (reminder) {
      const newDue = new Date(Date.now() + mins * 60 * 1000);
      reminder.nextDue = newDue.toISOString();
      reminder.snoozed = true;
      await this.saveReminders();
      this.render();
      showToast(`Hatırlatıcı ${mins >= 1440 ? 'yarına' : mins + ' dakika'} ertelendi`, 'info');
    }
  }

  async markDone(reminderId) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    if (reminder.repeat && reminder.repeat !== 'none') {
      // Schedule next occurrence
      reminder.nextDue = this.getNextOccurrence(reminder).toISOString();
      reminder.snoozed = false;
    } else {
      reminder.completed = true;
    }

    await this.saveReminders();
    this.render();
    this.updateBadge();
  }

  getNextOccurrence(reminder) {
    const now = new Date();
    const current = new Date(reminder.nextDue || reminder.dueDate);
    let next = new Date(current);

    switch (reminder.repeat) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        while (next <= now) next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        while (next <= now) next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        while (next <= now) next.setMonth(next.getMonth() + 1);
        break;
    }
    return next;
  }

  async checkDueReminders() {
    const now = new Date();
    const dueReminders = this.reminders.filter(r => {
      if (r.completed || r.notified) return false;
      const dueDate = new Date(r.nextDue || r.dueDate);
      return dueDate <= now;
    });

    for (const reminder of dueReminders) {
      window.api.showNotification('🔔 Hatırlatıcı', reminder.title);
      this.showReminderPopup(reminder);
      reminder.notified = true;
    }

    if (dueReminders.length > 0) {
      await this.saveReminders();
      this.updateBadge();
    }
  }

  showReminderPopup(reminder) {
    const popup = document.createElement('div');
    popup.className = 'reminder-popup';
    popup.innerHTML = `
      <div class="reminder-popup-header">
        <span>🔔 ${window.i18n.t('reminders')}</span>
      </div>
      <div class="reminder-popup-title">${reminder.title}</div>
      <div class="reminder-popup-actions">
        <button class="btn-primary popup-done">${window.i18n.t('mark_done')}</button>
        <button class="btn-secondary popup-snooze-5">${window.i18n.t('snooze_5m')}</button>
        <button class="btn-secondary popup-snooze-15">${window.i18n.t('snooze_15m')}</button>
        <button class="icon-btn popup-close" style="margin-left:auto">✕</button>
      </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector('.popup-done').addEventListener('click', async () => {
      await this.markDone(reminder.id);
      popup.remove();
    });
    popup.querySelector('.popup-snooze-5').addEventListener('click', async () => {
      reminder.notified = false;
      await this.snooze(reminder.id, 5);
      popup.remove();
    });
    popup.querySelector('.popup-snooze-15').addEventListener('click', async () => {
      reminder.notified = false;
      await this.snooze(reminder.id, 15);
      popup.remove();
    });
    popup.querySelector('.popup-close').addEventListener('click', () => popup.remove());

    // Auto-dismiss after 30s
    setTimeout(() => popup.remove(), 30000);
  }

  updateBadge() {
    const now = new Date();
    const overdueCount = this.reminders.filter(r => {
      if (r.completed) return false;
      return new Date(r.nextDue || r.dueDate) <= now;
    }).length;

    const btn = document.querySelector('[data-module="reminders"]');
    const existingBadge = btn.querySelector('.badge');
    if (existingBadge) existingBadge.remove();

    if (overdueCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = overdueCount;
      btn.appendChild(badge);
    }
  }

  showCreateModal(existing = null) {
    const isEdit = !!existing;
    const modal = document.getElementById('modal-container');

    const dueDate = existing?.dueDate ? existing.dueDate.substring(0, 10) : '';
    const dueTime = existing?.dueDate ? existing.dueDate.substring(11, 16) : '09:00';

    modal.innerHTML = `
      <div class="modal-header">
        <h3>${isEdit ? window.i18n.t('edit') : window.i18n.t('new_reminder')}</h3>
        <button class="icon-btn" id="modal-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>${window.i18n.t('reminder_title')}</label>
          <input type="text" id="rem-input-title" value="${existing?.title || ''}" placeholder="${window.i18n.t('reminder_title')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${window.i18n.t('reminder_date')}</label>
            <input type="date" id="rem-input-date" value="${dueDate}">
          </div>
          <div class="form-group">
            <label>${window.i18n.t('reminder_time')}</label>
            <input type="time" id="rem-input-time" value="${dueTime}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${window.i18n.t('repeat')}</label>
            <select id="rem-input-repeat">
              <option value="none" ${(existing?.repeat || 'none') === 'none' ? 'selected' : ''}>${window.i18n.t('no_repeat')}</option>
              <option value="daily" ${existing?.repeat === 'daily' ? 'selected' : ''}>${window.i18n.t('daily')}</option>
              <option value="weekly" ${existing?.repeat === 'weekly' ? 'selected' : ''}>${window.i18n.t('weekly')}</option>
              <option value="monthly" ${existing?.repeat === 'monthly' ? 'selected' : ''}>${window.i18n.t('monthly')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${window.i18n.t('customer')}</label>
            <select id="rem-input-customer">${window.tagSystem.renderCustomerSelect(existing?.customerId)}</select>
          </div>
        </div>
        <div class="form-group">
          <label>${window.i18n.t('notes')}</label>
          <textarea class="input-lg" id="rem-input-notes" placeholder="${window.i18n.t('notes')}">${existing?.notes || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">${window.i18n.t('cancel')}</button>
        <button class="btn-primary" id="modal-save">${window.i18n.t('save')}</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');

    document.getElementById('modal-save').addEventListener('click', async () => {
      const title = document.getElementById('rem-input-title').value.trim();
      const date = document.getElementById('rem-input-date').value;
      const time = document.getElementById('rem-input-time').value;
      if (!title || !date) return;

      const dueDateTime = new Date(`${date}T${time || '09:00'}:00`);

      const data = {
        id: existing?.id || window.dataStore.generateId(),
        title,
        dueDate: dueDateTime.toISOString(),
        nextDue: existing?.nextDue || dueDateTime.toISOString(),
        repeat: document.getElementById('rem-input-repeat').value,
        customerId: document.getElementById('rem-input-customer').value || null,
        notes: document.getElementById('rem-input-notes').value.trim(),
        completed: existing?.completed || false,
        notified: false,
        snoozed: false,
        createdAt: existing?.createdAt || new Date().toISOString()
      };

      if (isEdit) {
        const idx = this.reminders.findIndex(r => r.id === existing.id);
        if (idx >= 0) this.reminders[idx] = data;
      } else {
        this.reminders.push(data);
      }

      await this.saveReminders();
      this.closeModal();
      this.render();
      this.updateBadge();
    });

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('rem-input-title').focus();
  }

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  async saveReminders() {
    await window.dataStore.saveReminders(this.reminders);
  }

  formatDateTime(date) {
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
}

window.reminderManager = new ReminderManager();
