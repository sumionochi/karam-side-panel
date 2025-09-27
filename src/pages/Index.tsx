// Index.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KarmaDisplay } from "@/components/KarmaDisplay";
import KarmaToday from "@/components/KarmaToday";
import { WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS } from "@/constants/contract";
import { KarmaService } from "@/services/KarmaService";
import KarmaAllTime from "@/components/KarmaAllTime";

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
    return () => { cancelled = true; };
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
          <p className="text-xs text-muted-foreground font-bold mt-1">
            BLOCKCHAIN KARMA SYSTEM
          </p>
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

      {/* Tabs */}
      <Tabs defaultValue="profile" className="kp-section w-full">
        <div className="tabs-scroll">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 min-w-[250px]">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="alltime">All-time</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="directory">Directory</TabsTrigger>
          </TabsList>
        </div>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4">
          <KarmaDisplay twitterUsername={normHandle} />
        </TabsContent>

        {/* Today */}
        <TabsContent value="today" className="space-y-4">
          <KarmaToday twitterUsername={normHandle} addressOverride={address} />
        </TabsContent>

        {/* Placeholders (will be replaced as we build) */}
        <TabsContent value="alltime">
          <KarmaAllTime twitterUsername={normHandle} addressOverride={address} />
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-2 border-border bg-card card-rounded shadow-sharp card-pad text-center text-xs text-muted-foreground">
            History view coming soon. (Timeline, filters, pagination)
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card className="border-2 border-border bg-card card-rounded shadow-sharp card-pad text-center text-xs text-muted-foreground">
            Admin/System view coming soon. (Owner, lastUpdated, maintenance events)
          </Card>
        </TabsContent>

        <TabsContent value="directory">
          <Card className="border-2 border-border bg-card card-rounded shadow-sharp card-pad text-center text-xs text-muted-foreground">
            Directory/Leaderboard coming soon. (Top karma holders, search)
          </Card>
        </TabsContent>
      </Tabs>

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