/* ═══════════════════════════════════════════════════ 
   MEETINGS — Toplantı Notları Module
   ═══════════════════════════════════════════════════ */

class MeetingManager {
  constructor() {
    this.searchTerm = '';
  }

  init() {
    document.getElementById('btn-new-meeting').addEventListener('click', () => this.createMeetingNote());
    document.getElementById('meeting-search')?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.render();
    });
    this.render();
  }

  createMeetingNote() {
    // Use tabManager's note prompt with isMeeting flag
    // First switch to editor module
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-module="editor"]').classList.add('active');
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById('module-editor').classList.add('active');

    window.tabManager.promptNewNote({ isMeeting: true, title: '', content: this.getMeetingTemplate() });
  }

  getMeetingTemplate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return `# Toplantı Notu — ${dateStr}
📅 Tarih: ${dateStr} ${timeStr}
👥 Katılımcılar: @

---

## Gündem


## Kararlar


## Aksiyon Maddeleri
- [ ] 

## Notlar

`;
  }

  getMeetingNotes() {
    const notes = window.notesManager?.getMeetingNotes() || [];
    if (!this.searchTerm) return notes;
    return notes.filter(n => 
      n.title.toLowerCase().includes(this.searchTerm) ||
      (n.content || '').toLowerCase().includes(this.searchTerm)
    );
  }

  render() {
    const container = document.getElementById('meetings-list');
    if (!container) return;
    
    const notes = this.getMeetingNotes();

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3>Henüz toplantı notu yok</h3>
          <p>"Yeni Toplantı Notu" ile toplantı kayıtlarınızı oluşturun</p>
        </div>
      `;
      return;
    }

    container.innerHTML = notes.map(note => {
      const customer = note.customerId ? window.tagSystem.getCustomerById(note.customerId) : null;
      const cat = note.category ? window.tagSystem.getCategoryById(note.category) : null;
      const preview = (note.content || '').replace(/^#.*$/gm, '').replace(/\n+/g, ' ').substring(0, 120).trim();
      const date = new Date(note.createdAt);
      const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      // Extract @mentions for display
      const mentionNames = (note.customerTags || []).map(id => window.tagSystem.getCustomerName(id)).filter(Boolean);

      return `
        <div class="meeting-card" data-open-meeting="${note.id}">
          <div class="meeting-card-left">
            <div class="meeting-date">
              <span class="meeting-day">${date.getDate()}</span>
              <span class="meeting-month">${date.toLocaleDateString('tr-TR', { month: 'short' })}</span>
            </div>
          </div>
          <div class="meeting-card-content">
            <div class="meeting-card-header">
              <h3 class="meeting-title">${note.title}</h3>
              <span class="meeting-time">${timeStr}</span>
            </div>
            <div class="meeting-tags">
              ${customer ? `<span class="note-meta-tag customer-tag">👤 ${customer.name}</span>` : ''}
              ${cat ? `<span class="note-meta-tag" style="background:${cat.color}20;color:${cat.color};border:1px solid ${cat.color}40">${cat.name}</span>` : ''}
              ${mentionNames.map(n => `<span class="note-meta-tag mention-tag">@${n}</span>`).join('')}
            </div>
            <p class="meeting-preview">${preview || 'Boş toplantı notu'}</p>
          </div>
          <div class="meeting-card-actions">
            <button class="icon-btn" data-meeting-delete="${note.id}" title="Sil">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.bindEvents(container);
  }

  bindEvents(container) {
    // Open in editor
    container.querySelectorAll('[data-open-meeting]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-meeting-delete]')) return;
        // Switch to editor
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-module="editor"]').classList.add('active');
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        document.getElementById('module-editor').classList.add('active');

        window.tabManager.openExistingNote(el.dataset.openMeeting);
      });
    });

    // Delete
    container.querySelectorAll('[data-meeting-delete]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.notesManager.deleteNote(el.dataset.meetingDelete);
        this.render();
      });
    });
  }
}

window.meetingManager = new MeetingManager();
