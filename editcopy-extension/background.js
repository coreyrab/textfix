// EditCopy Background Service Worker
// Manages badge count and tab lifecycle

const tabState = {};

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg.type === "CHANGE_SAVED" || msg.type === "CHANGE_REMOVED" || msg.type === "CHANGES_CLEARED") {
    tabState[tabId] = { changeCount: msg.changeCount || 0 };
    updateBadge(tabId);
  }

  if (msg.type === "DEACTIVATED") {
    // Content script deactivated itself (e.g. via Escape key)
    // Badge stays with count since changes are still in memory
  }
});

function updateBadge(tabId) {
  const count = tabState[tabId]?.changeCount || 0;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#3b82f6", tabId });
}

// Clean up when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabState[tabId];
});

// Clear state on navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    delete tabState[tabId];
    updateBadge(tabId);
  }
});
