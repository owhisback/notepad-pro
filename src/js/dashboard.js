/* ═══════════════════════════════════════════════════ 
   DASHBOARD — Overview & Weekly Wrap-Up
   ═══════════════════════════════════════════════════ */

class DashboardManager {
  constructor() {
    this.greeting = '';
  }

  init() {
    this.render();
  }

  render() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
    const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Gather data
    const tasks = window.taskManager?.tasks || [];
    const leads = window.leadManager?.leads || [];
    const notes = window.notesManager?.notes || [];
    const reminders = window.reminderManager?.reminders || [];
    const customers = window.tagSystem?.customers || [];

    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfTomorrow = new Date(tomorrow); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

    // Pending tasks (due today/tomorrow or overdue)
    const pendingTasks = tasks.filter(t => {
      if (t.status === 'done') return false;
      if (!t.dueDate) return t.status !== 'done';
      const d = new Date(t.dueDate); d.setHours(0,0,0,0);
      return d <= endOfTomorrow;
    }).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }).slice(0, 8);

    // Upcoming reminders
    const upcomingReminders = reminders.filter(r => {
      if (r.completed) return false;
      const d = new Date(r.nextDue || r.dueDate);
      return d >= now && d <= new Date(now.getTime() + 48 * 60 * 60 * 1000);
    }).sort((a, b) => new Date(a.nextDue || a.dueDate) - new Date(b.nextDue || b.dueDate)).slice(0, 5);

    // Active leads
    const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status));
    const recentLeads = activeLeads.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 5);

    // Weekly stats
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekTasks = tasks.filter(t => new Date(t.createdAt) >= weekAgo);
    const completedThisWeek = tasks.filter(t => t.status === 'done' && t.updatedAt && new Date(t.updatedAt) >= weekAgo);
    const thisWeekNotes = notes.filter(n => new Date(n.createdAt) >= weekAgo);
    const thisWeekLeads = leads.filter(l => new Date(l.createdAt) >= weekAgo);
    const wonLeads = leads.filter(l => l.status === 'won' && l.updatedAt && new Date(l.updatedAt) >= weekAgo);

    const statusLabels = {
      new: 'Yeni', quoted: 'Teklif Verildi', pending: 'Beklemede',
      todo: 'Yapılacak', 'in-progress': 'Devam Ediyor'
    };

    container.innerHTML = `
      <!-- Greeting -->
      <div class="dash-greeting">
        <div>
          <h1>${greeting}!</h1>
          <p class="dash-date">${dateStr}</p>
        </div>
      </div>

      <!-- Quick Stats Cards -->
      <div class="dash-stats">
        <div class="dash-stat-card">
          <div class="dash-stat-icon"><i data-lucide="list-checks"></i></div>
          <div class="dash-stat-data">
            <span class="dash-stat-value">${tasks.filter(t => t.status !== 'done').length}</span>
            <span class="dash-stat-label">Açık Görev</span>
          </div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-icon"><i data-lucide="trending-up"></i></div>
          <div class="dash-stat-data">
            <span class="dash-stat-value">${activeLeads.length}</span>
            <span class="dash-stat-label">Aktif Lead</span>
          </div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-icon"><i data-lucide="users"></i></div>
          <div class="dash-stat-data">
            <span class="dash-stat-value">${customers.length}</span>
            <span class="dash-stat-label">Müşteri</span>
          </div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-icon"><i data-lucide="bell-ring"></i></div>
          <div class="dash-stat-data">
            <span class="dash-stat-value">${upcomingReminders.length}</span>
            <span class="dash-stat-label">Hatırlatıcı</span>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="dash-grid">
        <!-- Pending Tasks -->
        <div class="dash-card">
          <div class="dash-card-header">
            <h3><i data-lucide="zap" class="dash-header-icon"></i> Bekleyen Görevler</h3>
            <span class="dash-card-count">${pendingTasks.length}</span>
          </div>
          <div class="dash-card-body">
            ${pendingTasks.length === 0 ? '<p class="dash-empty">Bekleyen görev yok 🎉</p>' :
              pendingTasks.map(t => {
                const overdue = t.dueDate && new Date(t.dueDate) < today;
                const isToday = t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString();
                return `
                  <div class="dash-task-item ${overdue ? 'overdue' : ''}" data-goto-task="${t.id}">
                    <span class="dash-task-status status-${t.status}"></span>
                    <span class="dash-task-title">${t.title}</span>
                    ${t.dueDate ? `<span class="dash-task-due ${overdue ? 'overdue' : isToday ? 'today' : ''}">${this.formatDate(t.dueDate)}</span>` : ''}
                  </div>
                `;
              }).join('')}
          </div>
        </div>

        <!-- Upcoming Reminders -->
        <div class="dash-card">
          <div class="dash-card-header">
            <h3><i data-lucide="bell" class="dash-header-icon"></i> Yaklaşan Hatırlatıcılar</h3>
            <span class="dash-card-count">${upcomingReminders.length}</span>
          </div>
          <div class="dash-card-body">
            ${upcomingReminders.length === 0 ? '<p class="dash-empty">Yakın hatırlatma yok</p>' :
              upcomingReminders.map(r => `
                <div class="dash-reminder-item">
                  <span class="dash-reminder-time">${this.formatTime(r.nextDue || r.dueDate)}</span>
                  <span class="dash-reminder-title">${r.title}</span>
                </div>
              `).join('')}
          </div>
        </div>

        <!-- Active Leads -->
        <div class="dash-card">
          <div class="dash-card-header">
            <h3><i data-lucide="bar-chart-3" class="dash-header-icon"></i> Aktif Leads</h3>
            <span class="dash-card-count">${activeLeads.length}</span>
          </div>
          <div class="dash-card-body">
            ${recentLeads.length === 0 ? '<p class="dash-empty">Aktif lead yok</p>' :
              recentLeads.map(l => {
                const customerName = l.customerId ? window.tagSystem?.getCustomerName(l.customerId) : '';
                return `
                  <div class="dash-lead-item">
                    <span class="status-badge ${l.status}">${statusLabels[l.status] || l.status}</span>
                    <span class="dash-lead-route">${l.origin || '?'} → ${l.destination || '?'}</span>
                    ${customerName ? `<span class="dash-lead-customer">${customerName}</span>` : ''}
                  </div>
                `;
              }).join('')}
          </div>
        </div>

        <!-- Weekly Wrap-Up -->
        <div class="dash-card dash-weekly">
          <div class="dash-card-header">
            <h3><i data-lucide="chart-line" class="dash-header-icon"></i> Haftalık Özet</h3>
            <span class="dash-card-subtitle">Son 7 Gün</span>
          </div>
          <div class="dash-card-body">
            <div class="dash-weekly-stats">
              <div class="dash-weekly-item">
                <span class="dash-weekly-value">${thisWeekTasks.length}</span>
                <span class="dash-weekly-label">Oluşturulan Görev</span>
              </div>
              <div class="dash-weekly-item">
                <span class="dash-weekly-value">${completedThisWeek.length}</span>
                <span class="dash-weekly-label">Tamamlanan</span>
              </div>
              <div class="dash-weekly-item">
                <span class="dash-weekly-value">${thisWeekLeads.length}</span>
                <span class="dash-weekly-label">Yeni Lead</span>
              </div>
              <div class="dash-weekly-item">
                <span class="dash-weekly-value">${wonLeads.length}</span>
                <span class="dash-weekly-label">Kazanılan</span>
              </div>
              <div class="dash-weekly-item">
                <span class="dash-weekly-value">${thisWeekNotes.length}</span>
                <span class="dash-weekly-label">Alınan Not</span>
              </div>
            </div>
            ${tasks.length > 0 ? `
              <div class="dash-completion-bar">
                <div class="dash-completion-label">
                  <span>Tamamlanma Oranı</span>
                  <span>${tasks.length > 0 ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0}%</span>
                </div>
                <div class="dash-progress-track">
                  <div class="dash-progress-fill" style="width: ${tasks.length > 0 ? (tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0}%"></div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Render Lucide icons inside dashboard
    if (window.lucide) lucide.createIcons({ nodes: container.querySelectorAll('[data-lucide]') });

    // Bind click events for go-to task
    container.querySelectorAll('[data-goto-task]').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-module="tasks"]').classList.add('active');
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        document.getElementById('module-tasks').classList.add('active');
      });
    });
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }

  formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date(); today.setHours(0,0,0,0);
    const dateOnly = new Date(d); dateOnly.setHours(0,0,0,0);
    const isToday = dateOnly.getTime() === today.getTime();
    const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Bugün ${time}` : `${this.formatDate(dateStr)} ${time}`;
  }
}

window.dashboardManager = new DashboardManager();
