/* ═══════════════════════════════════════════════════ 
   MARKDOWN — Split-view preview
   ═══════════════════════════════════════════════════ */

class MarkdownPreview {
  constructor() {
    this.isVisible = false;
    this.debounceTimer = null;
  }

  init() {
    document.getElementById('btn-close-preview').addEventListener('click', () => this.toggle(false));
  }

  toggle(show) {
    const preview = document.getElementById('markdown-preview');
    this.isVisible = show !== undefined ? show : !this.isVisible;

    if (this.isVisible) {
      preview.classList.remove('panel-hidden');
      this.update();
      // Watch for changes
      if (window.editorManager.editor) {
        this._disposable = window.editorManager.editor.onDidChangeModelContent(() => {
          this.debouncedUpdate();
        });
      }
    } else {
      preview.classList.add('panel-hidden');
      if (this._disposable) {
        this._disposable.dispose();
        this._disposable = null;
      }
    }
  }

  debouncedUpdate() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.update(), 300);
  }

  update() {
    if (!this.isVisible) return;
    const content = window.editorManager.getContent();
    const previewEl = document.getElementById('preview-content');
    
    try {
      // Simple markdown parser (no external dependency needed at runtime)
      previewEl.innerHTML = this.parseMarkdown(content);
    } catch (e) {
      previewEl.textContent = content;
    }
  }

  parseMarkdown(md) {
    let html = md
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold & Italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links & Images
      .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Unordered lists
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>(\s*<br>)?)+/g, (match) => {
      return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
    });

    return `<p>${html}</p>`;
  }
}

window.markdownPreview = new MarkdownPreview();
