// src/hooks/useXHandle.ts
import { useEffect, useState } from "react";
import { getActiveTabInfo, getStoredHandle } from "@/lib/chrome";

export function useXHandle() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [handle, setHandle] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { tabId: id, handle: h } = await getActiveTabInfo();
      if (!mounted) return;
      setTabId(id ?? null);
      setHandle(h ?? null);

      if (!h && id) {
        const cached = await getStoredHandle(id);
        if (mounted && cached) setHandle(cached);
      }
    })();

    const onMsg = (msg: any) => {
      if (msg?.type === "X_HANDLE") {
        if (tabId && msg.tabId && tabId !== msg.tabId) return;
        setHandle(msg.handle ?? null);
      }
    };

    chrome.runtime.onMessage.addListener(onMsg);
    return () => {
      mounted = false;
      chrome.runtime.onMessage.removeListener(onMsg);
    };
  }, [tabId]);

  return { tabId, handle, setHandle };
}
