(function () {
  // Prevent double-injection
  if (window.__copyEditorActive) {
    window.__copyEditorDeactivate?.();
    return;
  }
  window.__copyEditorActive = true;

  // ── State ──────────────────────────────────────────────
  const changes = [];
  let editMode = true;
  let hoveredEl = null;
  let activePopover = null;

  // ── Styles ─────────────────────────────────────────────
  const STYLES = document.createElement("style");
  STYLES.id = "__copy-editor-styles";
  STYLES.textContent = `
    .__ce-highlight {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
      cursor: pointer !important;
      transition: outline-color 0.15s ease;
    }
    .__ce-edited {
      outline: 2px dashed #f59e0b !important;
      outline-offset: 2px !important;
      background: rgba(245, 158, 11, 0.08) !important;
    }
    .__ce-popover-drag {
      height: 24px;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: -16px -16px 12px -16px;
      border-radius: 10px 10px 0 0;
      background: #181825;
      border-bottom: 1px solid #45475a;
      user-select: none;
    }
    .__ce-popover-drag:active { cursor: grabbing; }
    .__ce-popover-drag::after {
      content: '';
      width: 32px;
      height: 3px;
      border-radius: 2px;
      background: #585b70;
    }
    .__ce-popover {
      position: absolute;
      z-index: 2147483647;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-width: 320px;
      max-width: 480px;
      color: #cdd6f4;
    }
    .__ce-popover label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a6adc8;
      margin-bottom: 4px;
    }
    .__ce-popover-original {
      font-size: 13px;
      color: #bac2de;
      background: #313244;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 12px;
      max-height: 80px;
      overflow-y: auto;
      word-break: break-word;
      line-height: 1.4;
      border: 1px solid #45475a;
    }
    .__ce-popover textarea {
      width: 100%;
      min-height: 60px;
      background: #313244;
      color: #cdd6f4;
      border: 1px solid #585b70;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
      line-height: 1.4;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .__ce-popover textarea:focus {
      border-color: #3b82f6;
    }
    .__ce-popover-tabs {
      display: flex;
      gap: 0;
      margin-bottom: 12px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #45475a;
    }
    .__ce-popover-tab {
      flex: 1;
      padding: 6px 0;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      background: #313244;
      color: #6c7086;
      border: none;
      font-family: inherit;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .__ce-popover-tab:hover { color: #a6adc8; }
    .__ce-popover-tab.__ce-tab-active {
      background: #45475a;
      color: #cdd6f4;
    }
    .__ce-popover-prompt-hint {
      font-size: 11px;
      color: #6c7086;
      font-style: italic;
      margin-bottom: 6px;
    }
    .__ce-popover-buttons {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: space-between;
      align-items: center;
    }
    .__ce-popover-buttons-right {
      display: flex;
      gap: 8px;
    }
    .__ce-btn-undo {
      background: none;
      border: 1px solid #45475a;
      color: #a6adc8;
      width: 32px;
      height: 32px;
      min-width: 32px;
      padding: 0 !important;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, border-color 0.15s ease;
      font-family: inherit;
      overflow: visible;
    }
    .__ce-btn-undo svg {
      flex-shrink: 0;
    }
    .__ce-btn-undo:hover:not(:disabled) {
      background: #313244;
      border-color: #585b70;
    }
    .__ce-btn-undo:disabled {
      opacity: 0.25;
      cursor: default;
    }
    .__ce-popover-buttons button {
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .__ce-popover-buttons button:active {
      transform: scale(0.97);
    }
    .__ce-btn-save {
      background: #3b82f6;
      color: #fff;
    }
    .__ce-btn-save:hover { background: #2563eb; }
    .__ce-btn-cancel {
      background: #45475a;
      color: #cdd6f4;
    }
    .__ce-btn-cancel:hover { background: #585b70; }

    /* ── Panel ── */
    .__ce-panel {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #cdd6f4;
    }
    .__ce-panel-toggle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #3b82f6;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(59,130,246,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, transform 0.15s ease;
      position: absolute;
      bottom: 0;
      right: 0;
    }
    .__ce-panel-toggle:hover { background: #2563eb; transform: scale(1.05); }
    .__ce-panel-toggle.__ce-active {
      background: #f59e0b;
      box-shadow: 0 4px 16px rgba(245,158,11,0.4);
    }
    .__ce-panel-toggle.__ce-active:hover { background: #d97706; }
    .__ce-panel-body {
      position: absolute;
      bottom: 60px;
      right: 0;
      width: 420px;
      max-height: 480px;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .__ce-panel-body.__ce-open { display: flex; }
    .__ce-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #45475a;
      background: #181825;
      border-radius: 12px 12px 0 0;
    }
    .__ce-panel-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #cdd6f4;
    }
    .__ce-panel-header-actions {
      display: flex;
      gap: 6px;
    }
    .__ce-panel-header-actions button {
      padding: 4px 10px;
      border: none;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s ease;
    }
    .__ce-btn-copy {
      background: #3b82f6;
      color: #fff;
    }
    .__ce-btn-copy:hover { background: #2563eb; }
    .__ce-btn-clear {
      background: #45475a;
      color: #cdd6f4;
    }
    .__ce-btn-clear:hover { background: #585b70; }
    .__ce-btn-close-panel {
      background: #45475a;
      color: #cdd6f4;
    }
    .__ce-btn-close-panel:hover { background: #585b70; }
    .__ce-panel-list {
      overflow-y: auto;
      padding: 8px;
      flex: 1;
    }
    .__ce-panel-empty {
      text-align: center;
      color: #6c7086;
      padding: 32px 16px;
      font-style: italic;
    }
    .__ce-change-card {
      background: #313244;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 6px;
      border: 1px solid #45475a;
    }
    .__ce-change-card:last-child { margin-bottom: 0; }
    .__ce-change-num {
      display: inline-block;
      background: #3b82f6;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      border-radius: 50%;
      margin-right: 6px;
    }
    .__ce-change-selector {
      font-size: 11px;
      color: #a6adc8;
      font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
      word-break: break-all;
      margin: 6px 0;
    }
    .__ce-change-diff {
      font-size: 12px;
      line-height: 1.5;
    }
    .__ce-change-old {
      color: #f38ba8;
      text-decoration: line-through;
    }
    .__ce-change-new {
      color: #a6e3a1;
    }
    .__ce-change-remove {
      float: right;
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 14px;
      padding: 0 2px;
      line-height: 1;
    }
    .__ce-change-remove:hover { color: #f38ba8; }
    .__ce-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #f38ba8;
      color: #1e1e2e;
      font-size: 10px;
      font-weight: 700;
      width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      border-radius: 50%;
      display: none;
    }
    .__ce-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      background: #1e1e2e;
      color: #a6e3a1;
      border: 1px solid #a6e3a1;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      opacity: 0;
      transform: translateY(-8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .__ce-toast.__ce-show {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(STYLES);

  // ── Utilities ──────────────────────────────────────────
  function getCSSSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      let selector = cur.tagName.toLowerCase();
      if (cur.id) {
        parts.unshift(`#${CSS.escape(cur.id)} > ${selector}`);
        break;
      }
      if (cur.className && typeof cur.className === "string") {
        const classes = cur.className
          .trim()
          .split(/\s+/)
          .filter((c) => !c.startsWith("__ce-"))
          .slice(0, 2);
        if (classes.length) selector += "." + classes.map(CSS.escape).join(".");
      }
      const parent = cur.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (s) => s.tagName === cur.tagName
        );
        if (siblings.length > 1) {
          const idx = siblings.indexOf(cur) + 1;
          selector += `:nth-of-type(${idx})`;
        }
      }
      parts.unshift(selector);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }

  function isTextElement(el) {
    if (!el || !el.tagName) return false;
    // Skip our own UI
    if (el.closest(".__ce-panel, .__ce-popover, .__ce-toast")) return false;
    // Must have some direct text content
    const hasDirectText = Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
    );
    if (!hasDirectText) return false;
    // Target leaf-ish text elements
    const tag = el.tagName.toLowerCase();
    const textTags = [
      "p","span","h1","h2","h3","h4","h5","h6","a","li","td","th",
      "label","button","em","strong","b","i","u","small","mark",
      "code","pre","blockquote","figcaption","dt","dd","summary","legend",
    ];
    if (textTags.includes(tag)) return true;
    // Also divs/sections that are leaf text holders
    if (el.children.length === 0 && el.textContent.trim().length > 0)
      return true;
    return false;
  }

  function getTextContent(el) {
    // Get only the direct text (not deeply nested children's text)
    return Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent)
      .join("")
      .trim();
  }

  function getElementContext(el) {
    const ctx = {};

    // 1. Nearest ancestor heading (section landmark)
    let node = el.parentElement;
    while (node && node !== document.body) {
      const heading = node.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading && heading !== el && !el.contains(heading)) {
        ctx.nearestHeading = heading.textContent.trim();
        break;
      }
      node = node.parentElement;
    }
    // Fallback: walk backwards through previous siblings / parents
    if (!ctx.nearestHeading) {
      let prev = el.previousElementSibling;
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        while (prev) {
          if (/^H[1-6]$/.test(prev.tagName)) {
            ctx.nearestHeading = prev.textContent.trim();
            break;
          }
          prev = prev.previousElementSibling;
        }
        if (ctx.nearestHeading) break;
        prev = parent.previousElementSibling;
        parent = parent.parentElement;
      }
    }

    // 2. Parent element tag + classes (component-level hint)
    const parent = el.parentElement;
    if (parent && parent !== document.body) {
      let parentDesc = parent.tagName.toLowerCase();
      if (parent.className && typeof parent.className === "string") {
        const cls = parent.className.trim().split(/\s+/)
          .filter((c) => !c.startsWith("__ce-"))
          .slice(0, 3)
          .join(".");
        if (cls) parentDesc += "." + cls;
      }
      ctx.parentElement = parentDesc;
    }

    // 3. Surrounding text (previous + next sibling text for disambiguation)
    const prevSib = el.previousElementSibling;
    const nextSib = el.nextElementSibling;
    if (prevSib && prevSib.textContent.trim()) {
      ctx.textBefore = prevSib.textContent.trim().slice(0, 80);
    }
    if (nextSib && nextSib.textContent.trim()) {
      ctx.textAfter = nextSib.textContent.trim().slice(0, 80);
    }

    return ctx;
  }

  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "__ce-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("__ce-show"));
    setTimeout(() => {
      t.classList.remove("__ce-show");
      setTimeout(() => t.remove(), 200);
    }, 2000);
  }

  // ── Popover ────────────────────────────────────────────
  let activeEditEl = null;

  function closePopover() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
    if (activeEditEl) {
      activeEditEl.classList.remove("__ce-highlight");
      activeEditEl = null;
    }
  }

  function openPopover(el) {
    closePopover();
    activeEditEl = el;
    el.classList.add("__ce-highlight");
    const originalText = el.textContent.trim();
    const pop = document.createElement("div");
    pop.className = "__ce-popover";

    let mode = "edit"; // "edit" or "prompt"

    pop.innerHTML = `
      <div class="__ce-popover-drag"></div>
      <div class="__ce-popover-tabs">
        <button class="__ce-popover-tab __ce-tab-active" data-mode="edit" type="button">Edit</button>
        <button class="__ce-popover-tab" data-mode="prompt" type="button">Prompt</button>
      </div>
      <label>Original</label>
      <div class="__ce-popover-original"></div>
      <div class="__ce-popover-prompt-hint" style="display:none">Describe how the agent should rewrite this text</div>
      <label class="__ce-textarea-label">New Copy</label>
      <textarea class="__ce-popover-textarea"></textarea>
      <div class="__ce-popover-buttons">
        <button class="__ce-btn-undo" type="button" title="Undo — show original" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
        <div class="__ce-popover-buttons-right">
          <button class="__ce-btn-cancel" type="button">Cancel</button>
          <button class="__ce-btn-save" type="button">Save Change</button>
        </div>
      </div>
    `;

    // Set text safely (not innerHTML)
    pop.querySelector(".__ce-popover-original").textContent = originalText;
    const textarea = pop.querySelector("textarea");
    const textareaLabel = pop.querySelector(".__ce-textarea-label");
    const promptHint = pop.querySelector(".__ce-popover-prompt-hint");
    const undoBtn = pop.querySelector(".__ce-btn-undo");
    textarea.value = originalText;

    // ── Tab switching ──
    const tabs = pop.querySelectorAll(".__ce-popover-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        mode = tab.dataset.mode;
        tabs.forEach((t) => t.classList.remove("__ce-tab-active"));
        tab.classList.add("__ce-tab-active");

        if (mode === "prompt") {
          textareaLabel.textContent = "Prompt";
          promptHint.style.display = "block";
          textarea.value = "";
          textarea.placeholder = 'e.g. "Make this more conversational" or "Shorten to under 10 words"';
          // Revert DOM to original while in prompt mode
          el.textContent = originalText;
        } else {
          textareaLabel.textContent = "New Copy";
          promptHint.style.display = "none";
          textarea.value = originalText;
          textarea.placeholder = "";
        }
        textarea.focus();
      });
    });

    // Position near the element
    document.body.appendChild(pop);
    const rect = el.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;

    // Keep on screen
    if (left + popRect.width > window.innerWidth) {
      left = window.innerWidth - popRect.width - 16;
    }
    if (top + popRect.height > window.scrollY + window.innerHeight) {
      top = rect.top + window.scrollY - popRect.height - 8;
    }
    pop.style.top = Math.max(0, top) + "px";
    pop.style.left = Math.max(0, left) + "px";

    activePopover = pop;

    // ── Drag handling ──
    const dragHandle = pop.querySelector(".__ce-popover-drag");
    let isDragging = false;
    let dragStartX, dragStartY, popStartX, popStartY;

    dragHandle.addEventListener("mousedown", (e) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      popStartX = parseInt(pop.style.left, 10);
      popStartY = parseInt(pop.style.top, 10);
      e.preventDefault();
    });

    document.addEventListener("mousemove", function onDragMove(e) {
      if (!isDragging) return;
      pop.style.left = (popStartX + e.clientX - dragStartX) + "px";
      pop.style.top = (popStartY + e.clientY - dragStartY) + "px";
    });

    document.addEventListener("mouseup", function onDragEnd() {
      isDragging = false;
    });

    // Focus and select all text
    textarea.focus();
    textarea.select();

    // ── Live preview: update DOM as you type (edit mode only) ──
    textarea.addEventListener("input", () => {
      if (mode !== "edit") return;
      const val = textarea.value.trim();
      if (val) {
        el.textContent = val;
      }
      // Enable undo when text differs from original
      undoBtn.disabled = (textarea.value.trim() === originalText);
    });

    // ── Undo/Redo toggle ──
    let showingOriginal = false;
    let savedEditText = "";

    undoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mode !== "edit") return;
      if (!showingOriginal) {
        // Undo: save current text, show original
        savedEditText = textarea.value;
        el.textContent = originalText;
        textarea.value = originalText;
        undoBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>';
        undoBtn.title = "Redo — show your edit";
        showingOriginal = true;
      } else {
        // Redo: restore the edited text
        textarea.value = savedEditText;
        el.textContent = savedEditText.trim() || originalText;
        undoBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
        undoBtn.title = "Undo — show original";
        showingOriginal = false;
      }
    });

    // Handlers
    pop.querySelector(".__ce-btn-cancel").onclick = (e) => {
      e.stopPropagation();
      // Revert the live preview back to original
      el.textContent = originalText;
      closePopover();
    };

    pop.querySelector(".__ce-btn-save").onclick = (e) => {
      e.stopPropagation();
      const textValue = textarea.value.trim();

      if (mode === "prompt") {
        // Prompt mode: record the prompt, don't change DOM
        if (!textValue) {
          closePopover();
          return;
        }
        el.classList.add("__ce-edited");
        changes.push({
          index: changes.length + 1,
          selector: getCSSSelector(el),
          original: originalText,
          prompt: textValue,
          tagName: el.tagName.toLowerCase(),
          context: getElementContext(el),
          timestamp: new Date().toISOString(),
        });
        renderPanel();
        showToast(`Prompt #${changes.length} saved`);
      } else {
        // Edit mode: apply the text change
        if (textValue && textValue !== originalText) {
          el.textContent = textValue;
          el.classList.add("__ce-edited");
          changes.push({
            index: changes.length + 1,
            selector: getCSSSelector(el),
            original: originalText,
            updated: textValue,
            tagName: el.tagName.toLowerCase(),
            context: getElementContext(el),
            timestamp: new Date().toISOString(),
          });
          renderPanel();
          showToast(`Change #${changes.length} saved`);
        } else {
          // No change or empty — revert
          el.textContent = originalText;
        }
      }
      closePopover();
    };

    // Save on Cmd/Ctrl+Enter, revert on Escape
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        pop.querySelector(".__ce-btn-save").click();
      }
      if (e.key === "Escape") {
        el.textContent = originalText;
        closePopover();
      }
    });
  }

  // ── Event Handlers ─────────────────────────────────────
  function onMouseOver(e) {
    if (!editMode) return;
    if (activePopover) return; // Don't highlight other elements while editing
    const el = e.target;
    if (!isTextElement(el)) return;
    if (hoveredEl) hoveredEl.classList.remove("__ce-highlight");
    el.classList.add("__ce-highlight");
    hoveredEl = el;
  }

  function onMouseOut(e) {
    if (hoveredEl) {
      // Don't remove highlight if this element is being actively edited
      if (hoveredEl !== activeEditEl) {
        hoveredEl.classList.remove("__ce-highlight");
      }
      hoveredEl = null;
    }
  }

  function onClick(e) {
    if (!editMode) return;
    const el = e.target;
    if (el.closest(".__ce-panel, .__ce-popover, .__ce-toast")) return;
    if (!isTextElement(el)) return;
    e.preventDefault();
    e.stopPropagation();
    openPopover(el);
  }

  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseout", onMouseOut, true);
  document.addEventListener("click", onClick, true);

  // ── Panel ──────────────────────────────────────────────
  const panel = document.createElement("div");
  panel.className = "__ce-panel";
  panel.innerHTML = `
    <div class="__ce-panel-body">
      <div class="__ce-panel-header">
        <h3>Copy Edits</h3>
        <div class="__ce-panel-header-actions">
          <button class="__ce-btn-copy" title="Copy changes as markdown">Copy</button>
          <button class="__ce-btn-clear" title="Clear all changes">Clear</button>
          <button class="__ce-btn-close-panel" title="Close panel">✕</button>
        </div>
      </div>
      <div class="__ce-panel-list">
        <div class="__ce-panel-empty">Click any text element to edit it</div>
      </div>
    </div>
    <button class="__ce-panel-toggle" title="Toggle Copy Editor">
      ✎
      <span class="__ce-badge">0</span>
    </button>
  `;
  document.body.appendChild(panel);

  const panelBody = panel.querySelector(".__ce-panel-body");
  const panelList = panel.querySelector(".__ce-panel-list");
  const toggleBtn = panel.querySelector(".__ce-panel-toggle");
  const badge = panel.querySelector(".__ce-badge");
  let panelOpen = false;

  toggleBtn.addEventListener("click", () => {
    panelOpen = !panelOpen;
    panelBody.classList.toggle("__ce-open", panelOpen);
    toggleBtn.classList.toggle("__ce-active", panelOpen);
  });

  panel.querySelector(".__ce-btn-close-panel").addEventListener("click", () => {
    panelOpen = false;
    panelBody.classList.remove("__ce-open");
    toggleBtn.classList.remove("__ce-active");
  });

  panel.querySelector(".__ce-btn-copy").addEventListener("click", () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md).then(() => {
      showToast("Copied to clipboard!");
    });
  });

  panel.querySelector(".__ce-btn-clear").addEventListener("click", () => {
    if (changes.length === 0) return;
    // Remove visual indicators
    document.querySelectorAll(".__ce-edited").forEach((el) => {
      el.classList.remove("__ce-edited");
    });
    changes.length = 0;
    renderPanel();
    showToast("All changes cleared");
  });

  function renderPanel() {
    badge.textContent = changes.length;
    badge.style.display = changes.length > 0 ? "block" : "none";

    if (changes.length === 0) {
      panelList.innerHTML =
        '<div class="__ce-panel-empty">Click any text element to edit it</div>';
      return;
    }

    panelList.innerHTML = changes
      .map(
        (c, i) => `
      <div class="__ce-change-card">
        <span class="__ce-change-num">${c.index}</span>
        <strong>&lt;${c.tagName}&gt;</strong>
        <button class="__ce-change-remove" data-idx="${i}" title="Remove this change">✕</button>
        <div class="__ce-change-selector">${escapeHtml(c.selector)}</div>
        <div class="__ce-change-diff">
          <div class="__ce-change-old">${escapeHtml(c.original)}</div>
          ${c.prompt
            ? `<div class="__ce-change-new" style="color:#89b4fa;font-style:italic">[prompt] ${escapeHtml(c.prompt)}</div>`
            : `<div class="__ce-change-new">${escapeHtml(c.updated)}</div>`
          }
        </div>
      </div>
    `
      )
      .join("");

    // Bind remove buttons
    panelList.querySelectorAll(".__ce-change-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        changes.splice(idx, 1);
        // Re-index
        changes.forEach((c, i) => (c.index = i + 1));
        renderPanel();
      });
    });
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Markdown Export ────────────────────────────────────
  function generateMarkdown() {
    const url = window.location.href;
    const title = document.title;
    let md = `# Copy Edit Requests\n\n`;
    md += `**Page:** ${title}\n`;
    md += `**URL:** ${url}\n`;
    md += `**Total edits:** ${changes.length}\n\n`;

    md += `## Changes\n\n`;
    md += `For each entry below, find the **current text** in the codebase and apply the requested change. Changes marked "ACTION: REPLACE" have an exact replacement string. Changes marked "ACTION: REWRITE" need you to generate new copy based on the instruction.\n\n`;

    changes.forEach((c) => {
      const action = c.prompt ? "REWRITE" : "REPLACE";
      md += `### ${c.index}. \`<${c.tagName}>\` — ${c.selector}\n\n`;
      md += `**ACTION:** ${action}\n\n`;

      // Location context to help the agent find the right element
      if (c.context) {
        md += `**Location context:**\n`;
        if (c.context.nearestHeading) {
          md += `- Under heading: "${c.context.nearestHeading}"\n`;
        }
        if (c.context.parentElement) {
          md += `- Parent: \`${c.context.parentElement}\`\n`;
        }
        if (c.context.textBefore) {
          md += `- Text before: "${c.context.textBefore}"\n`;
        }
        if (c.context.textAfter) {
          md += `- Text after: "${c.context.textAfter}"\n`;
        }
        md += `\n`;
      }

      md += `**Current text:**\n`;
      md += `\`\`\`\n${c.original}\n\`\`\`\n\n`;

      if (c.prompt) {
        md += `**Rewrite this text according to the following instruction:**\n`;
        md += `> ${c.prompt}\n\n`;
      } else {
        md += `**Replace with:**\n`;
        md += `\`\`\`\n${c.updated}\n\`\`\`\n\n`;
      }
    });

    // ── Compact summary ──
    md += `## Summary (compact)\n\n`;
    md += `\`\`\`\n`;
    changes.forEach((c) => {
      if (c.prompt) {
        md += `${JSON.stringify(c.original)} → [prompt] ${c.prompt}\n`;
      } else {
        md += `${JSON.stringify(c.original)} → ${JSON.stringify(c.updated)}\n`;
      }
    });
    md += `\`\`\`\n`;

    return md;
  }

  // ── Deactivate ─────────────────────────────────────────
  window.__copyEditorDeactivate = function () {
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    closePopover();
    panel.remove();
    STYLES.remove();
    document.querySelectorAll(".__ce-highlight, .__ce-edited").forEach((el) => {
      el.classList.remove("__ce-highlight", "__ce-edited");
    });
    delete window.__copyEditorActive;
    delete window.__copyEditorDeactivate;
    showToast("Copy Editor deactivated");
  };
})();
