/* ═══════════════════════════════════════════════════ 
   DATA STORE — JSON file-based persistence
   ═══════════════════════════════════════════════════ */

class DataStore {
  constructor() {
    this.cache = {};
  }

  async load(fileName, defaultValue = null) {
    if (this.cache[fileName]) return this.cache[fileName];
    const data = await window.api.dataRead(fileName);
    this.cache[fileName] = data || defaultValue;
    return this.cache[fileName];
  }

  async save(fileName, data) {
    this.cache[fileName] = data;
    return await window.api.dataWrite(fileName, data);
  }

  // Convenience methods
  async getCustomers() { return await this.load('customers.json', []); }
  async saveCustomers(data) { return await this.save('customers.json', data); }

  async getTasks() { return await this.load('tasks.json', []); }
  async saveTasks(data) { return await this.save('tasks.json', data); }

  async getLeads() { return await this.load('leads.json', []); }
  async saveLeads(data) { return await this.save('leads.json', data); }

  async getReminders() { return await this.load('reminders.json', []); }
  async saveReminders(data) { return await this.save('reminders.json', data); }

  async getNotes() { return await this.load('notes.json', []); }
  async saveNotes(data) { return await this.save('notes.json', data); }

  // Generic get/set for arbitrary keys
  async get(key) { return await this.load(`${key}.json`, null); }
  async set(key, data) { return await this.save(`${key}.json`, data); }

  async getSettings() { 
    return await this.load('settings.json', {
      theme: 'dark',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', monospace",
      minimap: true,
      language: 'tr',
      autosave: true,
      categories: [
        { id: 'teklif', name: 'Teklif', color: '#6c5ce7' },
        { id: 'takip', name: 'Takip', color: '#00b894' },
        { id: 'fatura', name: 'Fatura', color: '#fdcb6e' },
        { id: 'toplanti', name: 'Toplantı', color: '#74b9ff' },
        { id: 'genel', name: 'Genel', color: '#636e72' }
      ]
    }); 
  }
  async saveSettings(data) { return await this.save('settings.json', data); }

  async getRecentFiles() { return await this.load('recent-files.json', []); }
  async saveRecentFiles(data) { return await this.save('recent-files.json', data); }

  async getNotesMeta() { return await this.load('notes-meta.json', {}); }
  async saveNotesMeta(data) { return await this.save('notes-meta.json', data); }

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}

window.dataStore = new DataStore();
