// EditCopy Popup Script

const toggle = document.getElementById("toggle-active");
const changesList = document.getElementById("changes-list");
const footer = document.getElementById("popup-footer");
const btnCopy = document.getElementById("btn-copy");
const btnClear = document.getElementById("btn-clear");
const errorMsg = document.getElementById("error-msg");

let currentTabId = null;
let currentPage = null;

// ── Init: check current tab state ────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  currentTabId = tab.id;

  // Check if we can inject into this tab
  if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://") || tab.url?.startsWith("https://chromewebstore.google.com")) {
    errorMsg.textContent = "Cannot edit this page";
    errorMsg.style.display = "block";
    toggle.disabled = true;
    toggle.parentElement.style.opacity = "0.4";
    return;
  }

  // Try to get state from content script (if already injected)
  chrome.tabs.sendMessage(tab.id, { type: "GET_STATE" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      // Content script not injected yet
      toggle.checked = false;
      return;
    }
    toggle.checked = response.active;
    currentPage = response.page;
    renderChanges(response.changes);
  });
});

// ── Toggle ───────────────────────────────────────────────
toggle.addEventListener("change", async () => {
  if (toggle.checked) {
    try {
      // Inject content script (idempotent — script has re-injection guard)
      await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ["content.js"],
      });
      chrome.tabs.sendMessage(currentTabId, { type: "ACTIVATE" });
    } catch (err) {
      errorMsg.textContent = "Cannot edit this page";
      errorMsg.style.display = "block";
      toggle.checked = false;
    }
  } else {
    chrome.tabs.sendMessage(currentTabId, { type: "DEACTIVATE" });
  }
});

// ── Copy Markdown ────────────────────────────────────────
btnCopy.addEventListener("click", () => {
  chrome.tabs.sendMessage(currentTabId, { type: "GET_STATE" }, (response) => {
    if (!response) return;
    const md = generateMarkdown(response.changes, response.page);
    navigator.clipboard.writeText(md).then(() => {
      btnCopy.textContent = "Copied!";
      btnCopy.classList.add("btn-success");
      setTimeout(() => {
        btnCopy.textContent = "Copy Markdown";
        btnCopy.classList.remove("btn-success");
      }, 1500);
    });
  });
});

// ── Clear All ────────────────────────────────────────────
btnClear.addEventListener("click", () => {
  chrome.tabs.sendMessage(currentTabId, { type: "CLEAR_CHANGES" }, () => {
    renderChanges([]);
  });
});

// ── Render Changes ───────────────────────────────────────
function renderChanges(changes) {
  if (!changes || changes.length === 0) {
    changesList.innerHTML = '<div class="empty-state">Toggle on and click any text to edit</div>';
    footer.style.display = "none";
    return;
  }

  footer.style.display = "flex";
  changesList.innerHTML = changes
    .map(
      (c, i) => `
    <div class="change-card">
      <span class="change-num">${c.index}</span>
      <span class="change-tag">&lt;${escapeHtml(c.tagName)}&gt;</span>
      <button class="change-remove" data-idx="${i}" title="Remove">&#x2715;</button>
      <div class="change-selector">${escapeHtml(c.selector)}</div>
      <div class="change-diff">
        <div class="change-old">${escapeHtml(c.original)}</div>
        ${
          c.prompt
            ? `<div class="change-prompt">[prompt] ${escapeHtml(c.prompt)}</div>`
            : `<div class="change-new">${escapeHtml(c.updated)}</div>`
        }
      </div>
    </div>
  `
    )
    .join("");

  // Bind remove buttons
  changesList.querySelectorAll(".change-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      chrome.tabs.sendMessage(currentTabId, { type: "REMOVE_CHANGE", index: idx }, () => {
        // Re-fetch state after removal
        chrome.tabs.sendMessage(currentTabId, { type: "GET_STATE" }, (response) => {
          if (response) renderChanges(response.changes);
        });
      });
    });
  });
}

function escapeHtml(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ── Markdown Export ──────────────────────────────────────
function generateMarkdown(changes, page) {
  const url = page?.url || "";
  const title = page?.title || "";
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

    if (c.context) {
      md += `**Location context:**\n`;
      if (c.context.nearestHeading) md += `- Under heading: "${c.context.nearestHeading}"\n`;
      if (c.context.parentElement) md += `- Parent: \`${c.context.parentElement}\`\n`;
      if (c.context.textBefore) md += `- Text before: "${c.context.textBefore}"\n`;
      if (c.context.textAfter) md += `- Text after: "${c.context.textAfter}"\n`;
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
