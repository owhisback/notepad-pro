/* ═══════════════════════════════════════════════════ 
   i18n — Internationalization
   ═══════════════════════════════════════════════════ */

const TRANSLATIONS = {
  tr: {
    // Nav
    editor: 'Editör', tasks: 'Görevlerim', leads: 'Leads', 
    customers: 'Müşteriler', reminders: 'Hatırlatıcılar',
    files: 'Dosyalar', settings: 'Ayarlar',
    
    // Common
    all: 'Tümü', save: 'Kaydet', cancel: 'İptal', delete: 'Sil',
    edit: 'Düzenle', close: 'Kapat', add: 'Ekle', search: 'Ara',
    
    // Tasks
    new_task: 'Yeni Görev', todo: 'Yapılacak', in_progress: 'Devam Ediyor',
    done: 'Tamamlandı', task_title: 'Görev başlığı', task_desc: 'Açıklama',
    category: 'Kategori', priority: 'Öncelik', due_date: 'Bitiş Tarihi',
    customer: 'Müşteri', checklist: 'Kontrol Listesi', add_item: 'Madde ekle',
    high: 'Yüksek', medium: 'Orta', low: 'Düşük', no_customer: 'Müşteri yok',
    
    // Leads
    new_lead: 'Yeni Lead', route: 'Rota', origin: 'Kalkış', destination: 'Varış',
    cargo_type: 'Kargo Tipi', weight: 'Ağırlık (kg)', price: 'Fiyat',
    status: 'Durum', notes: 'Notlar',
    status_new: 'Yeni', status_quoted: 'Teklif Verildi', status_pending: 'Beklemede',
    status_won: 'Kazanıldı', status_lost: 'Kaybedildi',
    total_leads: 'Toplam', active_leads: 'Aktif', won_leads: 'Kazanılan',
    
    // Customers
    new_customer: 'Yeni Müşteri', company_name: 'Şirket Adı',
    contact_person: 'İletişim Kişisi', email: 'E-posta', phone: 'Telefon',
    customer_note: 'Not', related_items: 'İlişkili Öğeler',
    
    // Reminders
    new_reminder: 'Yeni Hatırlatıcı', reminder_title: 'Başlık',
    reminder_date: 'Tarih', reminder_time: 'Saat', repeat: 'Tekrar',
    no_repeat: 'Tekrar Yok', daily: 'Her Gün', weekly: 'Her Hafta',
    monthly: 'Her Ay', sound: 'Sesli Uyarı', snooze: 'Ertele',
    snooze_5m: '5 dakika', snooze_15m: '15 dakika', snooze_1h: '1 saat',
    snooze_tomorrow: 'Yarın', mark_done: 'Tamamlandı',
    overdue: 'Süresi Geçen', active: 'Aktif', completed: 'Tamamlanan',
    
    // Settings
    appearance: 'Görünüm', theme: 'Tema', font_size: 'Font Boyutu',
    font_family: 'Font Ailesi', language: 'Dil', interface_language: 'Arayüz Dili',
    categories: 'Kategoriler', dark: 'Karanlık', light: 'Aydınlık',
    
    // Editor
    untitled: 'Adsız', words: 'kelime', characters: 'karakter',
    file_saved: 'Dosya kaydedildi', file_opened: 'Dosya açıldı',
    
    // Empty states
    no_tasks: 'Henüz görev yok', no_tasks_desc: 'Yeni bir görev oluşturarak başlayın',
    no_leads: 'Henüz lead yok', no_leads_desc: 'Yeni bir lead ekleyerek başlayın',
    no_customers: 'Henüz müşteri yok', no_customers_desc: 'Yeni bir müşteri ekleyerek başlayın',
    no_reminders: 'Henüz hatırlatıcı yok', no_reminders_desc: 'Yeni bir hatırlatıcı oluşturun',
  },
  en: {
    editor: 'Editor', tasks: 'My Tasks', leads: 'Leads',
    customers: 'Customers', reminders: 'Reminders',
    files: 'Files', settings: 'Settings',
    
    all: 'All', save: 'Save', cancel: 'Cancel', delete: 'Delete',
    edit: 'Edit', close: 'Close', add: 'Add', search: 'Search',
    
    new_task: 'New Task', todo: 'To Do', in_progress: 'In Progress',
    done: 'Done', task_title: 'Task title', task_desc: 'Description',
    category: 'Category', priority: 'Priority', due_date: 'Due Date',
    customer: 'Customer', checklist: 'Checklist', add_item: 'Add item',
    high: 'High', medium: 'Medium', low: 'Low', no_customer: 'No customer',
    
    new_lead: 'New Lead', route: 'Route', origin: 'Origin', destination: 'Destination',
    cargo_type: 'Cargo Type', weight: 'Weight (kg)', price: 'Price',
    status: 'Status', notes: 'Notes',
    status_new: 'New', status_quoted: 'Quoted', status_pending: 'Pending',
    status_won: 'Won', status_lost: 'Lost',
    total_leads: 'Total', active_leads: 'Active', won_leads: 'Won',
    
    new_customer: 'New Customer', company_name: 'Company Name',
    contact_person: 'Contact Person', email: 'Email', phone: 'Phone',
    customer_note: 'Note', related_items: 'Related Items',
    
    new_reminder: 'New Reminder', reminder_title: 'Title',
    reminder_date: 'Date', reminder_time: 'Time', repeat: 'Repeat',
    no_repeat: 'No Repeat', daily: 'Daily', weekly: 'Weekly',
    monthly: 'Monthly', sound: 'Sound Alert', snooze: 'Snooze',
    snooze_5m: '5 minutes', snooze_15m: '15 minutes', snooze_1h: '1 hour',
    snooze_tomorrow: 'Tomorrow', mark_done: 'Mark Done',
    overdue: 'Overdue', active: 'Active', completed: 'Completed',
    
    appearance: 'Appearance', theme: 'Theme', font_size: 'Font Size',
    font_family: 'Font Family', language: 'Language', interface_language: 'Interface Language',
    categories: 'Categories', dark: 'Dark', light: 'Light',
    
    untitled: 'Untitled', words: 'words', characters: 'characters',
    file_saved: 'File saved', file_opened: 'File opened',
    
    no_tasks: 'No tasks yet', no_tasks_desc: 'Start by creating a new task',
    no_leads: 'No leads yet', no_leads_desc: 'Start by adding a new lead',
    no_customers: 'No customers yet', no_customers_desc: 'Start by adding a new customer',
    no_reminders: 'No reminders yet', no_reminders_desc: 'Create a new reminder',
  }
};

class I18n {
  constructor() {
    this.currentLang = 'tr';
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this.updateDOM();
  }

  t(key) {
    return TRANSLATIONS[this.currentLang]?.[key] || TRANSLATIONS['tr'][key] || key;
  }

  updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (el.tagName === 'INPUT' && el.type !== 'checkbox') {
        el.placeholder = this.t(key);
      } else {
        el.textContent = this.t(key);
      }
    });
    document.getElementById('status-locale').textContent = this.currentLang.toUpperCase();
  }
}

window.i18n = new I18n();
