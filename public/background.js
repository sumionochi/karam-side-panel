// public/background.js

// Open sidepanel when the toolbar icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab?.id) return;
    if (chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  });
  
  // --- X handle extraction helpers ---
  
  function extractXHandle(urlString) {
    try {
      const u = new URL(urlString);
      const isX = u.hostname === "x.com" || u.hostname === "twitter.com";
      if (!isX) return null;
  
      const [first] = u.pathname.split("/").filter(Boolean);
      if (!first) return null;
  
      // ignore non-profile roots
      const banned = new Set([
        "home", "i", "explore", "compose", "messages",
        "notifications", "settings", "search", "login", "signup",
        "tos", "privacy"
      ]);
      if (banned.has(first)) return null;
  
      // heuristic bounds
      if (first.length < 1 || first.length > 32) return null;
  
      return first;
    } catch {
      return null;
    }
  }
  
  async function setSession(key, value) {
    const api = chrome.storage?.session ?? chrome.storage.local;
    try {
      await api.set({ [key]: value });
    } catch (e) {
      // no-op
    }
  }
  
  async function getSession(key) {
    const api = chrome.storage?.session ?? chrome.storage.local;
    try {
      const obj = await api.get(key);
      return obj?.[key] ?? null;
    } catch {
      return null;
    }
  }
  
  function broadcastHandle(tabId, handle) {
    chrome.runtime.sendMessage({ type: "X_HANDLE", tabId, handle });
  }
  
  // On navigation completion → detect handle, cache, broadcast
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab?.url) return;
    const handle = extractXHandle(tab.url);
    await setSession(`handle:${tabId}`, handle);
    if (handle) broadcastHandle(tabId, handle);
  
    // Ensure side panel is enabled for this tab
    if (chrome.sidePanel?.setOptions) {
      chrome.sidePanel.setOptions({ tabId, path: "index.html", enabled: true });
    }
  });
  
  // On tab activation → refresh handle, cache, broadcast
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId);
    if (!tab?.url) return;
    const handle = extractXHandle(tab.url);
    await setSession(`handle:${tabId}`, handle);
    if (handle) broadcastHandle(tabId, handle);
  });
  
  // On install → open panel on action click
  chrome.runtime.onInstalled.addListener(() => {
    if (chrome.sidePanel?.setPanelBehavior) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  });
  
  // Message endpoints for sidepanel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      switch (request?.type || request?.action) {
        case "GET_ACTIVE_TAB": {
          const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
          const tabId = active?.id ?? null;
          const url = active?.url ?? null;
          const handle = url ? extractXHandle(url) : null;
          sendResponse({ tabId, url, handle });
          return;
        }
  
        case "GET_STORED_HANDLE": {
          const tabId = request?.tabId;
          if (!tabId) return sendResponse({ handle: null });
          const handle = await getSession(`handle:${tabId}`);
          sendResponse({ handle });
          return;
        }
  
        case "openSidePanel":
        case "OPEN_SIDEPANEL": {
          const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (active?.id && chrome.sidePanel?.open) {
            await chrome.sidePanel.open({ tabId: active.id });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false });
          }
          return;
        }
  
        case "getTabInfo": {
          const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
          sendResponse({ success: true, tab: active });
          return;
        }
  
        case "storage": {
          if (request.operation === "get") {
            const res = await getSession(request.key);
            sendResponse({ success: true, data: res });
            return;
          } else if (request.operation === "set") {
            await setSession(request.key, request.value);
            sendResponse({ success: true });
            return;
          }
          sendResponse({ success: false, error: "Unknown storage op" });
          return;
        }
  
        default:
          sendResponse({ success: false, error: "Unknown message" });
          return;
      }
    })();
  
    return true; // keep channel open for async
  });
  