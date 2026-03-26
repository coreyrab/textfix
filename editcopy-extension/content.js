// EditCopy Content Script
// Injected programmatically via chrome.scripting.executeScript

if (!window.__editCopyInjected) {
  window.__editCopyInjected = true;

  // ── State ──────────────────────────────────────────────
  const changes = [];
  const originalTextMap = new WeakMap();
  let active = false;
  let hoveredEl = null;
  let activePopover = null;
  let activeEditEl = null;

  // ── Styles ─────────────────────────────────────────────
  const STYLES = document.createElement("style");
  STYLES.id = "__ce-styles";
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
    if (el.closest(".__ce-popover, .__ce-toast")) return false;
    const hasDirectText = Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
    );
    if (!hasDirectText) return false;
    const tag = el.tagName.toLowerCase();
    const textTags = [
      "p","span","h1","h2","h3","h4","h5","h6","a","li","td","th",
      "label","button","em","strong","b","i","u","small","mark",
      "code","pre","blockquote","figcaption","dt","dd","summary","legend",
    ];
    if (textTags.includes(tag)) return true;
    if (el.children.length === 0 && el.textContent.trim().length > 0)
      return true;
    return false;
  }

  function getElementContext(el) {
    const ctx = {};
    let node = el.parentElement;
    while (node && node !== document.body) {
      const heading = node.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading && heading !== el && !el.contains(heading)) {
        ctx.nearestHeading = heading.textContent.trim();
        break;
      }
      node = node.parentElement;
    }
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

  function serializeChange(c) {
    return {
      index: c.index,
      selector: c.selector,
      original: c.original,
      updated: c.updated || undefined,
      prompt: c.prompt || undefined,
      tagName: c.tagName,
      context: c.context,
      timestamp: c.timestamp,
    };
  }

  function notifyBackground(type) {
    chrome.runtime.sendMessage({ type, changeCount: changes.length });
  }

  // ── Popover ────────────────────────────────────────────
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

  function setDirectText(el, newText) {
    const textNodes = Array.from(el.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE
    );
    if (textNodes.length === 0) {
      el.textContent = newText;
      return;
    }
    textNodes[0].textContent = newText;
    for (let i = 1; i < textNodes.length; i++) {
      textNodes[i].textContent = "";
    }
  }

  function openPopover(el) {
    closePopover();
    activeEditEl = el;
    el.classList.add("__ce-highlight");
    const currentText = el.textContent.trim();
    if (!originalTextMap.has(el)) {
      originalTextMap.set(el, currentText);
    }
    const originalText = originalTextMap.get(el);
    const displayText = currentText;
    const pop = document.createElement("div");
    pop.className = "__ce-popover";

    let mode = "edit";

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

    pop.querySelector(".__ce-popover-original").textContent = originalText;
    const textarea = pop.querySelector("textarea");
    const textareaLabel = pop.querySelector(".__ce-textarea-label");
    const promptHint = pop.querySelector(".__ce-popover-prompt-hint");
    const undoBtn = pop.querySelector(".__ce-btn-undo");
    textarea.value = displayText;

    // Tab switching
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
          setDirectText(el, originalText);
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
    if (left + popRect.width > window.innerWidth) {
      left = window.innerWidth - popRect.width - 16;
    }
    if (top + popRect.height > window.scrollY + window.innerHeight) {
      top = rect.top + window.scrollY - popRect.height - 8;
    }
    pop.style.top = Math.max(0, top) + "px";
    pop.style.left = Math.max(0, left) + "px";

    activePopover = pop;

    // Drag handling
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

    textarea.focus();
    textarea.select();

    // Live preview (edit mode only)
    textarea.addEventListener("input", () => {
      if (mode !== "edit") return;
      const val = textarea.value.trim();
      if (val) setDirectText(el, val);
      undoBtn.disabled = (textarea.value.trim() === originalText);
    });

    // Undo/Redo toggle
    let showingOriginal = false;
    let savedEditText = "";

    undoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mode !== "edit") return;
      if (!showingOriginal) {
        savedEditText = textarea.value;
        setDirectText(el, originalText);
        textarea.value = originalText;
        undoBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>';
        undoBtn.title = "Redo — show your edit";
        showingOriginal = true;
      } else {
        textarea.value = savedEditText;
        setDirectText(el, savedEditText.trim() || originalText);
        undoBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
        undoBtn.title = "Undo — show original";
        showingOriginal = false;
      }
    });

    // Cancel
    pop.querySelector(".__ce-btn-cancel").onclick = (e) => {
      e.stopPropagation();
      setDirectText(el, originalText);
      closePopover();
    };

    // Save
    pop.querySelector(".__ce-btn-save").onclick = (e) => {
      e.stopPropagation();
      const textValue = textarea.value.trim();
      const existingIdx = changes.findIndex((c) => c._el === el);

      if (mode === "prompt") {
        if (!textValue) { closePopover(); return; }
        el.classList.add("__ce-edited");
        const entry = {
          index: existingIdx >= 0 ? changes[existingIdx].index : changes.length + 1,
          _el: el,
          selector: getCSSSelector(el),
          original: originalText,
          prompt: textValue,
          tagName: el.tagName.toLowerCase(),
          context: getElementContext(el),
          timestamp: new Date().toISOString(),
        };
        if (existingIdx >= 0) { changes[existingIdx] = entry; }
        else { changes.push(entry); }
        notifyBackground("CHANGE_SAVED");
        showToast(existingIdx >= 0 ? "Prompt updated" : `Prompt #${changes.length} saved`);
      } else {
        if (textValue && textValue !== originalText) {
          setDirectText(el, textValue);
          el.classList.add("__ce-edited");
          const entry = {
            index: existingIdx >= 0 ? changes[existingIdx].index : changes.length + 1,
            _el: el,
            selector: getCSSSelector(el),
            original: originalText,
            updated: textValue,
            tagName: el.tagName.toLowerCase(),
            context: getElementContext(el),
            timestamp: new Date().toISOString(),
          };
          if (existingIdx >= 0) { changes[existingIdx] = entry; }
          else { changes.push(entry); }
          notifyBackground("CHANGE_SAVED");
          showToast(existingIdx >= 0 ? "Change updated" : `Change #${changes.length} saved`);
        } else {
          setDirectText(el, originalText);
        }
      }
      closePopover();
    };

    // Keyboard shortcuts
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        pop.querySelector(".__ce-btn-save").click();
      }
      if (e.key === "Escape") {
        setDirectText(el, originalText);
        closePopover();
      }
    });
  }

  // ── Event Handlers ─────────────────────────────────────
  function onMouseOver(e) {
    if (!active) return;
    if (activePopover) return;
    const el = e.target;
    if (!isTextElement(el)) return;
    if (hoveredEl) hoveredEl.classList.remove("__ce-highlight");
    el.classList.add("__ce-highlight");
    hoveredEl = el;
  }

  function onMouseOut(e) {
    if (hoveredEl) {
      if (hoveredEl !== activeEditEl) {
        hoveredEl.classList.remove("__ce-highlight");
      }
      hoveredEl = null;
    }
  }

  function onClick(e) {
    if (!active) return;
    const el = e.target;
    if (el.closest(".__ce-popover, .__ce-toast")) return;
    if (!isTextElement(el)) return;
    e.preventDefault();
    e.stopPropagation();
    openPopover(el);
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && !activePopover && active) {
      deactivate();
      chrome.runtime.sendMessage({ type: "DEACTIVATED" });
    }
  }

  // ── Activate / Deactivate ──────────────────────────────
  function activate() {
    if (active) return;
    active = true;
    document.head.appendChild(STYLES);
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    showToast("EditCopy activated");
  }

  function deactivate() {
    if (!active) return;
    active = false;
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    closePopover();
    if (STYLES.parentNode) STYLES.remove();
    document.querySelectorAll(".__ce-highlight, .__ce-edited").forEach((el) => {
      el.classList.remove("__ce-highlight", "__ce-edited");
    });
    showToast("EditCopy deactivated");
  }

  // ── Message Listener ───────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "ACTIVATE") {
      activate();
      sendResponse({ ok: true });
    }
    if (msg.type === "DEACTIVATE") {
      deactivate();
      sendResponse({ ok: true });
    }
    if (msg.type === "GET_STATE") {
      sendResponse({
        active,
        changes: changes.map(serializeChange),
        page: { url: location.href, title: document.title },
      });
    }
    if (msg.type === "REMOVE_CHANGE") {
      const idx = msg.index;
      if (idx >= 0 && idx < changes.length) {
        const removed = changes[idx];
        if (removed._el) removed._el.classList.remove("__ce-edited");
        changes.splice(idx, 1);
        changes.forEach((c, i) => (c.index = i + 1));
        notifyBackground("CHANGE_REMOVED");
      }
      sendResponse({ ok: true });
    }
    if (msg.type === "CLEAR_CHANGES") {
      document.querySelectorAll(".__ce-edited").forEach((el) => {
        el.classList.remove("__ce-edited");
      });
      changes.length = 0;
      notifyBackground("CHANGES_CLEARED");
      sendResponse({ ok: true });
    }
    return true;
  });
}
