// Background script for Karma Tracker extension
console.log("[KarmaTracker] background loaded");

const lastUsernameByTab = new Map();

function isTwitterUrl(url = "") {
  try {
    const u = new URL(url);
    return /(^|\.)x\.com$|(^|\.)twitter\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

// Installed
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[KarmaTracker] onInstalled:", details.reason);
  try {
    // Make the side panel open when toolbar icon clicked
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (e) {
    console.warn("[KarmaTracker] setPanelBehavior not available?", e);
  }
});

// Toolbar icon → open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (e) {
    console.error("[KarmaTracker] open side panel failed:", e);
  }
});

// Enable the side panel on Twitter/X tabs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab?.url) return;

  if (changeInfo.status === "loading" || changeInfo.status === "complete") {
    const onTwitter = isTwitterUrl(tab.url);
    try {
      await chrome.sidePanel.setOptions({
        tabId,
        path: "index.html",
        enabled: onTwitter
      });

      await chrome.action.setTitle({
        tabId,
        title: onTwitter
          ? "Open Karma Tracker (Twitter/X detected)"
          : "Open Karma Tracker"
      });

      if (onTwitter) {
        console.log("[KarmaTracker] side panel enabled for tab", tabId);
      }
    } catch (e) {
      console.error("[KarmaTracker] setOptions error:", e);
    }
  }
});

// Relay & utility messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Debug
  // console.log("[KarmaTracker] bg got:", message, "from", sender);

  // Side panel asks for active tab info
  if (message?.action === "GET_TAB_INFO") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs?.[0];
      if (!t) return sendResponse({ error: "No active tab" });
      sendResponse({ tabId: t.id, url: t.url, title: t.title });
    });
    return true; // async
  }

  // Side panel asks for the current Twitter handle
  if (message?.action === "GET_TWITTER_HANDLE") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const t = tabs?.[0];
      if (!t?.id) return sendResponse({ error: "No active tab" });

      if (!isTwitterUrl(t.url)) {
        return sendResponse({ error: "Not on Twitter/X", url: t.url });
      }

      // Send message to the content script in the active tab
      try {
        const res = await chrome.tabs.sendMessage(t.id, {
          type: "GET_TWITTER_HANDLE"
        });
        // Cache and return
        if (res?.handle) lastUsernameByTab.set(t.id, res.handle);
        sendResponse({
          handle: res?.handle ?? null,
          url: res?.url ?? t.url,
          isTwitter: true
        });
      } catch (e) {
        // This is where you'd see: "Could not establish connection. Receiving end does not exist."
        console.warn("[KarmaTracker] content script not reachable:", e);

        // Optional: programmatically (re)inject content.js, then retry (still Option B)
        try {
          await chrome.scripting.executeScript({
            target: { tabId: t.id },
            files: ["content.js"]
          });
          const res2 = await chrome.tabs.sendMessage(t.id, {
            type: "GET_TWITTER_HANDLE"
          });
          if (res2?.handle) lastUsernameByTab.set(t.id, res2.handle);
          sendResponse({
            handle: res2?.handle ?? null,
            url: res2?.url ?? t.url,
            isTwitter: true,
            injected: true
          });
        } catch (e2) {
          console.error("[KarmaTracker] injection+retry failed:", e2);
          const cached = lastUsernameByTab.get(t.id) || null;
          sendResponse({
            handle: cached,
            url: t.url,
            isTwitter: true,
            error: "Content script unreachable"
          });
        }
      }
    });
    return true; // async response
  }

  // Content script pushes updates on SPA/route changes
  if (message?.action === "USERNAME_CHANGED") {
    const tabId = sender?.tab?.id;
    if (tabId && message?.username !== undefined) {
      lastUsernameByTab.set(tabId, message.username || null);
      // Broadcast to any listeners (e.g., side panel)
      chrome.runtime.sendMessage({
        action: "USERNAME_CACHE_UPDATED",
        tabId,
        username: message.username || null,
        url: message.url
      }).catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.action === "OPEN_SIDEPANEL") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const t = tabs?.[0];
      if (!t) return sendResponse({ error: "No active tab" });
      try {
        await chrome.sidePanel.open({ windowId: t.windowId });
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ error: String(e?.message || e) });
      }
    });
    return true;
  }
});

// Optional: track when a tab is removed and clean up cache
chrome.tabs.onRemoved.addListener((tabId) => {
  lastUsernameByTab.delete(tabId);
});