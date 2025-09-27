// sidepanel/handle.ts
export async function getTwitterHandleFromActiveTab(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.id) return null;

  const [{ result } = { result: null }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try {
        const host = location.hostname;
        const isTwitter =
          /(^|\\.)x\\.com$/i.test(host) || /(^|\\.)twitter\\.com$/i.test(host);
        if (!isTwitter) return null;

        const parts = location.pathname.split("/").filter(Boolean);
        // Ignore non-profile routes like /i/*
        if (!parts[0] || parts[0] === "i") return null;

        const handle = parts[0].replace(/^@/, "").toLowerCase();
        // Basic allowlist for handle characters
        return /^[a-z0-9_]{1,15}$/i.test(handle) ? handle : null;
      } catch {
        return null;
      }
    },
  });

  return typeof result === "string" ? result : null;
}
