# 📝 Notepad Pro

A modern, feature-rich productivity application built with **Electron** and **Monaco Editor**. Designed for cargo sales professionals to manage notes, tasks, leads, customers, and reminders — all in one place.

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🏠 Dashboard
- Welcome greeting with real-time stats
- Pending tasks, upcoming reminders, active leads overview
- Weekly wrap-up with completion metrics

### 📓 OneNote-Style Notes
- **3-panel layout**: Notebooks → Pages → Editor
- Create custom notebooks with icons
- Rich text editing via Monaco Editor
- `/command` shortcuts (create tasks, leads, reminders inline)

### ✅ Task Management
- Kanban-style task board with priorities
- Customer assignment & category filters
- File attachments & inline notes
- Due date tracking with overdue alerts

### 📊 Lead Tracking
- Full lead pipeline (New → Quoted → Pending → Won/Lost)
- Origin/destination route tracking
- Customer-linked leads with status badges

### 👥 Customer CRM
- Compact card view with expand-on-click details
- Customer detail page with linked notes, tasks, and leads
- Key notes section for quick reference

### 🔔 Reminders
- Periodic & one-time reminders
- Desktop notifications
- Dashboard integration

### 🤝 Meeting Notes
- Dedicated meeting notes section
- Linked to customers and notebooks

## 🎨 Design

- **Lucide Icons** — clean, modern icon set
- **Dark theme** with customizable accent colors
- **Collapsible sidebar** — icon-only or pinned with labels
- **Inter + JetBrains Mono** typography
- Smooth animations and micro-interactions

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- npm

### Installation

```bash
git clone https://github.com/owhisback/notepad-pro.git
cd notepad-pro
npm install
npm start
```

### Development

```bash
# Run with DevTools open
npm start -- --dev
```

**Ctrl+R** / **F5** reloads the app window during development.

## 🗂️ Project Structure

```
notepad-pro/
├── main.js              # Electron main process
├── preload.js           # Secure bridge (IPC)
├── src/
│   ├── index.html       # Main UI
│   ├── js/
│   │   ├── app.js       # Bootstrap & navigation
│   │   ├── dashboard.js # Dashboard & weekly stats
│   │   ├── notes.js     # Notebooks & pages (OneNote-style)
│   │   ├── tasks.js     # Task management
│   │   ├── leads.js     # Lead pipeline
│   │   ├── customers.js # Customer CRM
│   │   ├── reminders.js # Reminder system
│   │   ├── meetings.js  # Meeting notes
│   │   ├── editor.js    # Monaco editor wrapper
│   │   ├── tabs.js      # Tab management
│   │   └── ...
│   └── styles/
│       ├── themes.css    # Color tokens & themes
│       ├── main.css      # Layout & sidebar
│       ├── dashboard.css # Dashboard widgets
│       ├── notes-ui.css  # 3-panel notes layout
│       ├── customers.css # Customer cards
│       └── ...
└── package.json
```

## 📦 Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Electron |
| Editor | Monaco Editor (VS Code engine) |
| Icons | Lucide Icons |
| Fonts | Inter, JetBrains Mono |
| Data | JSON file storage (local) |
| Language | Vanilla JS, CSS |

## 🌐 Localization

Built-in Turkish (TR) language support with i18n system. English support available.

## 📄 License

MIT
