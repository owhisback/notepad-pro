# Notepad-Pro — Bug Fix Talimatları

Bu projede kod incelemesi sonucu tespit edilen buglar aşağıda listelenmiştir. Lütfen hepsini düzelt.

---

## 🔴 BUG 1: Dashboard'da Hatırlatıcılar Her Zaman Boş Görünüyor (KRİTİK)

**Dosya:** `src/js/dashboard.js`

Dashboard render fonksiyonunda hatırlatıcılar filtrelenirken `r.datetime` alanı kullanılıyor, ancak Reminder veri modelinde bu alan yok. Doğru alan adları `r.nextDue` veya `r.dueDate` olmalı.

**Düzeltilecek satırlar:**
1. Satır 49: `const d = new Date(r.datetime);` → `const d = new Date(r.nextDue || r.dueDate);`
2. Satır 51: `.sort((a, b) => new Date(a.datetime) - new Date(b.datetime))` → `.sort((a, b) => new Date(a.nextDue || a.dueDate) - new Date(b.nextDue || b.dueDate))`
3. Satır 145: `${this.formatTime(r.datetime)}` → `${this.formatTime(r.nextDue || r.dueDate)}`

---

## 🟡 BUG 2: `extractMentions` Fonksiyonu Tanımsız

**Dosya:** `src/js/editor.js` (satır 391) ve `src/js/notes.js`

`editor.js` satır 391'de `window.notesManager?.extractMentions(fullContent)` çağrılıyor ama `NotesManager` sınıfında böyle bir metot yok. Bu, her slash komutu (`/lead`, `/task`, `/reminder`) çalıştırıldığında hata fırlatır.

**Düzeltme:** `src/js/notes.js` dosyasındaki `NotesManager` sınıfına şu metodu ekle:

```javascript
extractMentions(content) {
  if (!content) return [];
  const mentions = [];
  const regex = /@([\w\sçğıöşüÇĞİÖŞÜ]+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim();
    const customer = this.notes.length >= 0 
      ? window.tagSystem?.customers?.find(c => c.name.toLowerCase() === name.toLowerCase())
      : null;
    if (customer) {
      mentions.push(customer.id);
    }
  }
  return [...new Set(mentions)];
}
```

---

## 🟡 BUG 3: Lead ve Müşteri Silmede Onay Sorulmuyor

**Dosya:** `src/js/leads.js` (satır 121-124)

Lead silme handler'ında `confirm()` ile kullanıcıya onay sorulmadan doğrudan silme yapılıyor.

**Düzeltme:** leads.js satır 121-124'ü şu şekilde değiştir:
```javascript
el.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!confirm('Bu lead\'i silmek istediğinize emin misiniz?')) return;
  this.leads = this.leads.filter(l => l.id !== el.dataset.leadDelete);
  await this.saveLeads();
  this.render();
});
```

**Dosya:** `src/js/customers.js` (satır 130-132)

Müşteri silmede de aynı sorun var. Benzer şekilde `confirm()` ekle:
```javascript
el.addEventListener('click', async (e) => {
  e.stopPropagation();
  const customer = this.customers.find(c => c.id === el.dataset.customerDelete);
  if (!confirm(`"${customer?.name}" müşterisini silmek istediğinize emin misiniz?`)) return;
  this.customers = this.customers.filter(c => c.id !== el.dataset.customerDelete);
  await this.saveCustomers();
  await window.tagSystem.refreshCustomers();
  this.render();
});
```

**Dosya:** `src/js/tasks.js` (satır 182-196)

Task silmede de aynı sorun var. `confirm()` ekle:
```javascript
el.addEventListener('click', async (e) => {
  e.stopPropagation();
  const task = this.tasks.find(t => t.id === el.dataset.taskDelete);
  if (!confirm(`"${task?.title}" görevini silmek istediğinize emin misiniz?`)) return;
  if (task?.attachments) {
    for (const att of task.attachments) {
      await window.api.deleteAttachment(att.path);
    }
  }
  this.tasks = this.tasks.filter(t => t.id !== el.dataset.taskDelete);
  await this.saveTasks();
  this.render();
});
```

---

## 🟡 BUG 4: Türkçe Kategori İsimleri Aynı ID'yi Üretiyor

**Dosya:** `src/js/settings.js` (satır 107)

Kategori ID'si oluştururken Türkçe karakterler regex ile siliniyor. "Müşteri" → "mteri" olur, farklı isimler aynı ID'yi üretebilir.

**Düzeltme:** Satır 107'yi şu şekilde değiştir:
```javascript
const id = window.dataStore.generateId();
```
Bu şekilde her kategori benzersiz bir ID alır.

---

## 🟡 BUG 5: preload.js'de IPC Listener Memory Leak

**Dosya:** `preload.js` (satır 32-34)

`onMenuEvent` her çağrıda yeni bir listener ekliyor, kaldırma mekanizması yok. Aynı event'e birden fazla listener birikmesini engellemek için `removeAllListeners` ekle veya bir kez bağlanacak şekilde düzelt.

**Düzeltme:** `preload.js`'de `onMenuEvent`'i şu şekilde değiştir:
```javascript
onMenuEvent: (channel, callback) => {
  ipcRenderer.removeAllListeners(channel);
  ipcRenderer.on(channel, callback);
},

onCheckReminders: (callback) => {
  ipcRenderer.removeAllListeners('check-reminders');
  ipcRenderer.on('check-reminders', callback);
}
```

---

## 🟡 BUG 6: XSS — innerHTML ile Escape Edilmemiş Kullanıcı Verisi

Tüm render fonksiyonlarında kullanıcı girdisi (task title, müşteri adı, not içeriği vb.) `innerHTML` ile doğrudan DOM'a yazılıyor. Kullanıcı `<script>` veya `<img onerror>` gibi HTML kodu yazarsa çalışır.

**Düzeltme:** Bir escape helper fonksiyonu oluştur ve tüm kullanıcı verilerini render ederken kullan.

`src/js/fileManager.js` dosyasında `showToast` fonksiyonunun yanına şu helper'ı ekle:
```javascript
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
window.escapeHtml = escapeHtml;
```

Ardından kullanıcı verisi render edilen yerlerde `escapeHtml()` ile sarmalanmalı. Örnekler:
- `tasks.js:121` → `${escapeHtml(task.title)}`
- `tasks.js:122` → `${escapeHtml(task.description)}`
- `leads.js:81` → `${escapeHtml(customer?.name || '—')}`
- `customers.js:61` → `${escapeHtml(customer.name)}`
- `notes.js:254` → `${escapeHtml(note.title)}`
- Tüm modal form input `value` attribute'ları

---

## 🟢 BUG 7: Reminder Interval Temizlenmiyor

**Dosya:** `main.js` (satır 304-311)

`startReminderChecker()` ile başlatılan `setInterval`, pencere kapandığında temizlenmiyor.

**Düzeltme:** `main.js`'de `app.on('window-all-closed')` event handler'ına interval temizleme ekle:
```javascript
app.on('window-all-closed', () => {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
```

---

## 🟢 BUG 8: Binary Dosya Koruması Yok

**Dosya:** `main.js` (satır 84-96)

`file-open` handler'ı tüm dosyaları `utf-8` olarak okur. Binary dosya (resim, zip vb.) seçilirse bozuk içerik döner.

**Düzeltme:** Dosya açmadan önce boyut veya uzantı kontrolü ekle:
```javascript
ipcMain.handle('file-open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'css', 'html', 'py', 'xml', 'csv', 'ts', 'jsx', 'tsx', 'yaml', 'yml', 'sql', 'sh', 'bat', 'log', 'ini', 'cfg', 'env'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  
  // Check file size (skip files > 10MB)
  const stats = fs.statSync(filePath);
  if (stats.size > 10 * 1024 * 1024) {
    return { error: 'Dosya çok büyük (>10MB)' };
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
  } catch (err) {
    return { error: err.message };
  }
});
```

---

## 🟢 BUG 9: `icon.png` Dosyası Eksik

**Dosya:** `main.js` (satır 34)

`icon: path.join(__dirname, 'src', 'icon.png')` referansı var ama `src/` dizininde `icon.png` dosyası mevcut değil.

**Düzeltme:** Ya dosyayı oluştur ya da icon satırını kaldır/yorum satırı yap:
```javascript
// icon: path.join(__dirname, 'src', 'icon.png')
```

---

## 🧹 CLEANUP: `marked` Paketi Kullanılmıyor

**Dosya:** `package.json` (satır 16)

`marked: ^11.0.0` dependency olarak tanımlı ama `markdown.js`'de kendi custom parser kullanılıyor. `marked` gereksiz yer kaplıyor.

**Düzeltme:** `package.json`'dan `marked` bağımlılığını kaldır ve `npm install` çalıştır.
