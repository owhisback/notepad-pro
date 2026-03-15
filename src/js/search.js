/* ═══════════════════════════════════════════════════ 
   SEARCH — Find & Replace (delegates to Monaco)
   ═══════════════════════════════════════════════════ */

class SearchManager {
  openFind() {
    window.editorManager.openFind();
  }

  openReplace() {
    window.editorManager.openReplace();
  }
}

window.searchManager = new SearchManager();
