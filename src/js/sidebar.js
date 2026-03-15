/* ═══════════════════════════════════════════════════ 
   SIDEBAR — File tree
   ═══════════════════════════════════════════════════ */

class SidebarManager {
  constructor() {
    this.isOpen = false;
    this.currentFolder = null;
  }

  init() {
    document.getElementById('btn-open-folder').addEventListener('click', () => this.openFolder());
  }

  toggle(show) {
    const sidebar = document.getElementById('file-sidebar');
    this.isOpen = show !== undefined ? show : !this.isOpen;
    
    if (this.isOpen) {
      sidebar.classList.remove('panel-hidden');
    } else {
      sidebar.classList.add('panel-hidden');
    }
  }

  async openFolder() {
    const tree = await window.api.openFolder();
    if (!tree) return;
    this.renderTree(tree);
  }

  renderTree(items) {
    const container = document.getElementById('file-tree');
    container.innerHTML = this.buildTreeHTML(items);
    this.bindTreeEvents(container);
  }

  buildTreeHTML(items, depth = 0) {
    return items.map(item => {
      if (item.type === 'directory') {
        return `
          <div class="tree-folder" data-path="${item.path}">
            <div class="tree-item" style="padding-left:${14 + depth * 16}px">
              <svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>${item.name}</span>
            </div>
            <div class="tree-children">
              ${item.children ? this.buildTreeHTML(item.children, depth + 1) : ''}
            </div>
          </div>
        `;
      }
      return `
        <div class="tree-item" style="padding-left:${14 + depth * 16}px" data-file-path="${item.path}">
          <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span>${item.name}</span>
        </div>
      `;
    }).join('');
  }

  bindTreeEvents(container) {
    // Folder toggle
    container.querySelectorAll('.tree-folder > .tree-item').forEach(el => {
      el.addEventListener('click', () => {
        el.parentElement.classList.toggle('open');
      });
    });

    // File open
    container.querySelectorAll('.tree-item[data-file-path]').forEach(el => {
      el.addEventListener('click', async () => {
        // Switch to editor module
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-module="editor"]').classList.add('active');
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        document.getElementById('module-editor').classList.add('active');
        
        await window.fileManager.openFilePath(el.dataset.filePath);
      });
    });
  }
}

window.sidebarManager = new SidebarManager();
