// KaramDisplay.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  KarmaService,
  type UserKarmaData,
  type KarmaEvent,
} from "@/services/KarmaService";

// ---- UI limits (keep in sync with contract if you later expose them) ----
const GIVE_LIMIT_PER_DAY = 30;   // displayed in whole "karma" units (not wei)
const SLASH_LIMIT_PER_DAY = 20;  // displayed in whole "karma" units (not wei)

interface KarmaDisplayProps {
  twitterUsername: string | null;
}

type ExtendedUserKarmaData = UserKarmaData & Partial<{
  givenToday: string | number;      // daily given (normalized to whole karma)
  slashedToday: string | number;    // daily slashed (normalized)
  totalReceived: string | number;   // all-time
  totalSlashed: string | number;    // all-time
  twitterUsername: string;          // from chain (if you later expose inverse mapping it’s trivial)
}>;

export const KarmaDisplay = ({ twitterUsername }: KarmaDisplayProps) => {
  const [karmaData, setKarmaData] = useState<ExtendedUserKarmaData | null>(null);
  const [recentEvents, setRecentEvents] = useState<KarmaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- helpers ----------
  const normHandle = useMemo(() => {
    if (!twitterUsername) return null;
    return twitterUsername.replace(/^@/, "").trim().toLowerCase();
  }, [twitterUsername]);

  const asNum = (v: unknown): number => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const pct = (value: number, max: number) => {
    if (max <= 0) return 0;
    const p = Math.max(0, Math.min(100, (value / max) * 100));
    return Math.round(p);
  };

  useEffect(() => {
    let cancelled = false;

    // clear if no handle
    if (!normHandle) {
      setKarmaData(null);
      setRecentEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchKarmaData = async () => {
      setLoading(true);
      setError(null);
      try {
        const svc: any = new KarmaService(); // `any` so we can call optional methods safely

        // 1) resolve address by twitter handle
        const address: string | null = await svc.getAddressByTwitterUsername(normHandle);

        if (!address || address === "0x0000000000000000000000000000000000000000") {
          if (!cancelled) {
            setError("User not found in karma system");
            setKarmaData(null);
            setRecentEvents([]);
          }
          return;
        }

        // 2) base snapshot (works with your current service)
        const base: UserKarmaData = await svc.getUserKarmaData(address);

        // 3) optional enrichers (automatically used if you add them to KarmaService)
        const extra: Partial<ExtendedUserKarmaData> = {};
        try {
          if (typeof svc.getUserUsageToday === "function") {
            const { givenToday, slashedToday } = await svc.getUserUsageToday(address);
            extra.givenToday = givenToday;
            extra.slashedToday = slashedToday;
          }
        } catch {}

        try {
          if (typeof svc.getUserTotals === "function") {
            const { totalReceived, totalSlashed } = await svc.getUserTotals(address);
            extra.totalReceived = totalReceived;
            extra.totalSlashed = totalSlashed;
          }
        } catch {}

        try {
          if (typeof svc.getTwitterByAddress === "function") {
            extra.twitterUsername = await svc.getTwitterByAddress(address);
          }
        } catch {}

        // 4) recent events
        let events: KarmaEvent[] = [];
        try {
          events = await svc.getRecentKarmaEvents(address);
        } catch {}

        if (!cancelled) {
          setKarmaData({ ...base, ...extra } as ExtendedUserKarmaData);
          setRecentEvents(Array.isArray(events) ? events.slice(0, 10) : []);
        }
      } catch (err) {
        console.error("Error fetching karma data:", err);
        if (!cancelled) {
          setError("Failed to fetch karma data");
          setKarmaData(null);
          setRecentEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchKarmaData();
    return () => {
      cancelled = true;
    };
  }, [normHandle]);

  // ------------------- UI states -------------------
  if (!twitterUsername) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp card-rounded card-pad">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black text-muted-foreground">
            NO USERNAME DETECTED
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp card-rounded card-pad">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black">LOADING…</div>
        </div>
      </Card>
    );
  }

  if (error || !karmaData) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp card-rounded card-pad">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black text-destructive">
            {error || "NOT FOUND"}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            @{normHandle} not registered in karma system
          </div>
        </div>
      </Card>
    );
  }

  // -------- computed fields for display --------
  const karmaValue = asNum((karmaData as any).karma); // service usually returns a normalized string
  const karmaColor =
    karmaValue > 500
      ? "text-karma-positive"
      : karmaValue < 100
      ? "text-karma-negative"
      : "text-karma-neutral";

  const givenToday = asNum(karmaData.givenToday);
  const slashedToday = asNum(karmaData.slashedToday);
  const totalReceived = asNum(karmaData.totalReceived);
  const totalSlashed = asNum(karmaData.totalSlashed);
  const netAllTime = totalReceived - totalSlashed;

  const repScore =
    totalReceived + totalSlashed > 0
      ? (totalReceived / Math.max(1, totalSlashed)).toFixed(2)
      : "—";

  const shortAddr =
    (karmaData as any).address
      ? `${(karmaData as any).address.slice(0, 6)}…${(karmaData as any).address.slice(-4)}`
      : "—";

  const shownTwitter =
    karmaData.twitterUsername || normHandle || (karmaData as any)?.socialConnections?.twitterUsername;

  const github = (karmaData as any)?.socialConnections?.githubUsername || "";
  const discord = (karmaData as any)?.socialConnections?.discordUsername || "";

  // ------------------- render -------------------
  return (
    <div className="space-y-4">
      {/* Main Karma Card */}
      <Card className="border-2 border-border bg-card shadow-strong card-rounded card-pad">
        <div className="space-y-3">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            KARMA PROFILE
          </div>

          {/* stack on mobile, two columns on >= sm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Username */}
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm font-bold">USERNAME</span>
              <span className="font-black mono-truncate">@{shownTwitter}</span>
            </div>

            {/* Status */}
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm font-bold">STATUS</span>
              {karmaData.isRegistered ? (
                <Badge
                  variant="outline"
                  className="whitespace-nowrap text-[10px] px-2 py-[2px] border-karma-positive text-karma-positive font-black"
                >
                  REGISTERED
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="whitespace-nowrap text-[10px] px-2 py-[2px] border-karma-negative text-karma-negative font-black"
                >
                  NOT REGISTERED
                </Badge>
              )}
            </div>

            {/* Karma */}
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm font-bold">KARMA</span>
              <span className={`font-black ${karmaColor} text-xl sm:text-2xl`}>
                {Math.floor(karmaValue)}
              </span>
            </div>

            {/* Address */}
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm font-bold">ADDRESS</span>
              <span className="text-xs text-muted-foreground mono-truncate">{shortAddr}</span>
            </div>
          </div>

          {/* All-time quick stats (show only if service provided totals) */}
          {(totalReceived > 0 || totalSlashed > 0) && (
            <>
              <Separator className="my-1" />
              {/* On very narrow widths show 2 cols; Net spans both. On >= sm, show clean 3 cols */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-muted-foreground">RECEIVED</div>
                  <div className="text-base font-black">{Math.floor(totalReceived)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-bold text-muted-foreground">SLASHED</div>
                  <div className="text-base font-black">{Math.floor(totalSlashed)}</div>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-bold text-muted-foreground">NET</div>
                  <div className="text-base font-black">{Math.floor(netAllTime)}</div>
                </div>
              </div>
              <div className="text-center text-[10px] text-muted-foreground">
                Reputation score: <span className="font-black">{repScore}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Social Connections */}
      {(github || discord || shownTwitter) && (
        <Card className="border-2 border-border bg-card shadow-sharp card-rounded card-pad">
          <div>
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
              SOCIAL CONNECTIONS
            </div>

            {/* Use single column on mobile; align right value; wrap as needed */}
            <div className="space-y-2">
              {shownTwitter && (
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold">TWITTER</span>
                  <span className="text-xs font-black mono-truncate">@{shownTwitter}</span>
                </div>
              )}
              {github && (
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold">GITHUB</span>
                  <span className="text-xs font-black mono-truncate">{github}</span>
                </div>
              )}
              {discord && (
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold">DISCORD</span>
                  <span className="text-xs font-black mono-truncate">{discord}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Today usage bars (only if we have today numbers) */}
      {(givenToday > 0 || slashedToday > 0) && (
        <Card className="border-2 border-border bg-card shadow-sharp card-rounded card-pad">
          <div>
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
              TODAY&apos;S USAGE
            </div>

            {/* Given today */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Given</span>
                <span>
                  {Math.floor(givenToday)} / {GIVE_LIMIT_PER_DAY}
                </span>
              </div>
              <div className="h-2 bg-muted rounded">
                <div
                  className="h-2 rounded bg-foreground/80"
                  style={{ width: `${pct(givenToday, GIVE_LIMIT_PER_DAY)}%` }}
                />
              </div>
            </div>

            {/* Slashed today */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Slashed</span>
                <span>
                  {Math.floor(slashedToday)} / {SLASH_LIMIT_PER_DAY}
                </span>
              </div>
              <div className="h-2 bg-muted rounded">
                <div
                  className="h-2 rounded bg-foreground/50"
                  style={{ width: `${pct(slashedToday, SLASH_LIMIT_PER_DAY)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      {recentEvents.length > 0 && (
        <Card className="border-2 border-border bg-card shadow-sharp card-rounded card-pad">
          <div>
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
              RECENT ACTIVITY
            </div>

            <div className="space-y-3">
              {recentEvents.slice(0, 5).map((event, index) => (
                <div key={`${event.type}-${event.timestamp}-${index}`} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`whitespace-nowrap text-[10px] px-2 py-[2px] font-black ${
                        event.type === "given"
                          ? "border-karma-positive text-karma-positive"
                          : "border-karma-negative text-karma-negative"
                      }`}
                    >
                      {event.type === "given" ? "+" : "-"}
                      {Math.floor(parseFloat(event.amount))}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(event.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>

                  {event.reason && (
                    <div className="text-xs text-muted-foreground wrap-balance">"{event.reason}"</div>
                  )}

                  {index < Math.min(5, recentEvents.length) - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};