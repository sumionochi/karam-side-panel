// Content script (Twitter/X)
// Listens for messages and replies with the current profile @handle.
// Also pushes updates to background when SPA routes change.

(function () {
    console.log("[KarmaTracker] content loaded:", location.href);
  
    let lastUrl = location.href;
    let lastHandle = null;
    let detecting = false;
  
    const EXCLUDED = new Set([
      "home","explore","notifications","messages","bookmarks","lists",
      "profile","settings","help","search","i","intent","login","logout",
      "signup","welcome","tos","privacy","compose","about","download","jobs",
      "press","developers","status","accessibility","embed","brand","blog","advertising"
    ]);
  
    function isOnTwitter() {
      const h = location.hostname;
      return /(^|\.)x\.com$|(^|\.)twitter\.com$/i.test(h);
    }
  
    function handleFromUrl() {
      const m = location.pathname.match(/^\/([A-Za-z0-9_]+)(?:\/|$)/);
      if (!m) return null;
      const cand = m[1];
      if (!cand) return null;
      if (EXCLUDED.has(cand.toLowerCase())) return null;
      return cand.replace(/^@/, "");
    }
  
    // Lightweight DOM assist (fallback if URL is ambiguous)
    function handleFromDom() {
      const selectors = [
        '[data-testid="UserName"] span[dir="ltr"]',
        '[data-testid="UserName"] span',
        'h1[data-testid="UserName"] span',
        'h1[role="heading"] span[dir="ltr"]',
        'h1[role="heading"] span'
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const t = el?.textContent?.trim();
        if (t && /^[A-Za-z0-9_@]+$/.test(t)) {
          return t.replace(/^@/, "");
        }
      }
      return null;
    }
  
    function detectHandle() {
      if (!isOnTwitter()) return null;
      return handleFromUrl() || handleFromDom();
    }
  
    async function notifyUsernameChanged(newHandle) {
      if (newHandle === lastHandle) return;
      lastHandle = newHandle;
      try {
        await chrome.runtime.sendMessage({
          action: "USERNAME_CHANGED",
          username: newHandle || null,
          url: location.href,
          ts: Date.now()
        });
      } catch (e) {
        // Background might not care; ignore.
      }
    }
  
    function detectAndNotify() {
      if (detecting) return;
      detecting = true;
      try {
        const h = detectHandle();
        notifyUsernameChanged(h);
      } finally {
        detecting = false;
      }
    }
  
    // Initial detect
    detectAndNotify();
  
    // Observe SPA route/content changes
    const mo = new MutationObserver(() => {
      // Fast path: URL changed
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(detectAndNotify, 200);
        return;
      }
      // Slow path: profile header re-rendered
      setTimeout(detectAndNotify, 400);
    });
  
    mo.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  
    // History API hooks for SPA navigation
    const _ps = history.pushState;
    const _rs = history.replaceState;
    history.pushState = function () {
      _ps.apply(this, arguments);
      setTimeout(detectAndNotify, 200);
    };
    history.replaceState = function () {
      _rs.apply(this, arguments);
      setTimeout(detectAndNotify, 200);
    };
    window.addEventListener("popstate", () => setTimeout(detectAndNotify, 200));
  
    // Message handler (background/side panel → content)
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg?.type === "GET_TWITTER_HANDLE") {
        const h = detectHandle();
        sendResponse({
          handle: h ? h.toLowerCase() : null,
          url: location.href,
          isTwitter: isOnTwitter()
        });
        return true;
      }
      return false;
    });
  })();