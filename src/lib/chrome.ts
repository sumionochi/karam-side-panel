// src/lib/chrome.ts
export function getActiveTabInfo(): Promise<{
  tabId: number | null;
  url: string | null;
  handle: string | null;
}> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB" }, (res) =>
      resolve(res)
    );
  });
}

export function getStoredHandle(tabId: number): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_STORED_HANDLE", tabId }, (res) =>
      resolve(res?.handle ?? null)
    );
  });
}
