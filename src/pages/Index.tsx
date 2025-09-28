// Index.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { KarmaDisplay } from "@/components/KarmaDisplay";
import KarmaToday from "@/components/KarmaToday";
import KarmaAllTime from "@/components/KarmaAllTime";
import KarmaHistory from "@/components/KarmaHistory";
import KarmaAdmin from "@/components/KarmaAdmin";
import KarmaDirectory from "@/components/KarmaDirectory";
import { Separator } from "@/components/ui/separator";
import { WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS } from "@/constants/contract";
import { KarmaService } from "@/services/KarmaService";

declare const chrome: any;

const Index = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const [address, setAddress] = useState<string | null>(null);
  const [resolvingAddr, setResolvingAddr] = useState(false);

  const normHandle = useMemo(
    () => (username ? username.replace(/^@/, "").trim().toLowerCase() : null),
    [username]
  );

  const detect = useCallback(async () => {
    if (!chrome?.runtime?.sendMessage) {
      setUsername(null);
      return;
    }
    setDetecting(true);
    try {
      const res = await chrome.runtime.sendMessage({ action: "GET_TWITTER_HANDLE" });
      if (res?.handle && typeof res.handle === "string") {
        setUsername(res.handle.toLowerCase());
      } else {
        setUsername(null);
      }
    } catch (e) {
      console.warn("[KarmaTracker] detect() messaging failed:", e);
      setUsername(null);
    } finally {
      setDetecting(false);
    }
  }, []);

  useEffect(() => {
    detect();
    const onVis = () => {
      if (document.visibilityState === "visible") detect();
    };
    document.addEventListener("visibilitychange", onVis);

    const onBgMessage = (msg: any) => {
      if (msg?.action === "USERNAME_CACHE_UPDATED") detect();
    };
    chrome?.runtime?.onMessage?.addListener?.(onBgMessage);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      chrome?.runtime?.onMessage?.removeListener?.(onBgMessage);
    };
  }, [detect]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!normHandle) {
        setAddress(null);
        return;
      }
      setResolvingAddr(true);
      try {
        const svc: any = new KarmaService();
        const addr = await svc.getAddressByTwitterUsername(normHandle);
        if (!cancelled) {
          setAddress(
            addr && addr !== "0x0000000000000000000000000000000000000000" ? addr : null
          );
        }
      } catch (e) {
        console.warn("[KarmaTracker] address resolution failed:", e);
        if (!cancelled) setAddress(null);
      } finally {
        if (!cancelled) setResolvingAddr(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [normHandle]);

  const shortContract = WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS
    ? `${WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS.slice(0, 6)}...${WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS.slice(-4)}`
    : "—";

  return (
    <div className="karma-panel space-y-4">
      {/* Header */}
      <div className="kp-section py-4 border-b-2 border-border">
        <div className="text-center w-full">
          <h1 className="text-2xl font-black uppercase tracking-wider">KARMA TRACKER</h1>
          <p className="text-xs text-muted-foreground font-bold mt-1">BLOCKCHAIN KARMA SYSTEM</p>
          <div className="mt-2 text-[11px] text-muted-foreground wrap-balance">
            {detecting
              ? "Detecting Twitter handle…"
              : username ? (
                <>
                  Detected: <span className="font-black">@{username}</span>
                  {resolvingAddr
                    ? " • Resolving address…"
                    : address
                    ? <> • <span className="mono-truncate">{address}</span></>
                    : " • Not linked"}
                </>
              ) : "No Twitter handle detected on the current tab"}
          </div>
        </div>
      </div>

      {/* Single-scroll layout with separators */}
      <div className="kp-section space-y-4">
        {/* 1) Profile */}
        <KarmaDisplay twitterUsername={normHandle} />

        <Separator className="my-2" />

        {/* 2) Today */}
        <KarmaToday twitterUsername={normHandle} addressOverride={address} />

        <Separator className="my-2" />

        {/* 3) All-time */}
        <KarmaAllTime twitterUsername={normHandle} addressOverride={address} />

        <Separator className="my-2" />

        {/* 4) History */}
        <KarmaHistory twitterUsername={normHandle} addressOverride={address} />

        <Separator className="my-2" />

        {/* 5) Admin / System */}
        <KarmaAdmin />

        <Separator className="my-2" />

        {/* 6) Directory / Leaderboard */}
        <KarmaDirectory pageSize={20} maxScan={400} />
      </div>

      {/* Footer */}
      <div className="kp-section pt-4 border-t-2 border-border">
        <div className="text-xs text-muted-foreground text-center wrap-balance">
          WORLD SEPOLIA • CONTRACT: <span className="mono-truncate">{shortContract}</span>
        </div>
      </div>
    </div>
  );
};

export default Index;