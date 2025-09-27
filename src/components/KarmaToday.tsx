// KarmaToday.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KarmaService, type KarmaEvent } from "@/services/KarmaService";

/**
 * UI constants (mirror your contract limits; switch to on-chain constants later if you expose them)
 */
const GIVE_LIMIT_PER_DAY = 30;   // expressed in whole "karma" units (18-decimal token normalized)
const SLASH_LIMIT_PER_DAY = 20;  // same

interface KarmaTodayProps {
  /** Preferred input: twitter handle like "jack" or "@jack" */
  twitterUsername?: string | null;
  /** If you already have the address from the Profile tab, pass it to skip handle resolution */
  addressOverride?: string | null;
  /** Optional: how many top pairs to show per list */
  topN?: number;
}

/**
 * A Today-focused view:
 * - Given today vs limit
 * - Slashed today vs limit
 * - Top counterparties today (you-gave, you-slashed, you-received-from, you-were-slashed-by)
 *
 * Works with:
 * - KarmaService.getAddressByTwitterUsername(handle)
 * - KarmaService.getUserUsageToday(address)             (optional)
 * - KarmaService.getRecentKarmaEvents(address)          (required fallback; filters last 24h)
 * - KarmaService.getRecentKarmaEventsDetailed(address)  (optional; if available, includes from/to)
 */
export default function KarmaToday({
  twitterUsername = null,
  addressOverride = null,
  topN = 5,
}: KarmaTodayProps) {
  const [loading, setLoading] = useState(false);
  const [addr, setAddr] = useState<string | null>(addressOverride ?? null);
  const [error, setError] = useState<string | null>(null);

  const [givenToday, setGivenToday] = useState(0);
  const [slashedToday, setSlashedToday] = useState(0);

  type PairAgg = { address: string; total: number };
  const [topGiven, setTopGiven] = useState<PairAgg[]>([]);
  const [topSlashed, setTopSlashed] = useState<PairAgg[]>([]);
  const [topReceived, setTopReceived] = useState<PairAgg[]>([]);
  const [topVictim, setTopVictim] = useState<PairAgg[]>([]);

  const normHandle = useMemo(() => {
    if (!twitterUsername) return null;
    return twitterUsername.replace(/^@/, "").trim().toLowerCase();
  }, [twitterUsername]);

  const sinceCutoff = useMemo(() => Math.floor(Date.now() / 1000) - 24 * 60 * 60, []);

  const pct = (value: number, max: number) => {
    if (!max) return 0;
    return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  };

  const toLower = (s?: string) => (s ? s.toLowerCase() : s);

  // Sum helper
  const add = (map: Map<string, number>, key: string, amt: number) => {
    map.set(key, (map.get(key) ?? 0) + amt);
  };

  // Normalize event amount to number (your service usually returns strings already normalized)
  const amt = (e: KarmaEvent) => {
    const n = typeof e.amount === "number" ? e.amount : parseFloat(String(e.amount));
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const svc: any = new KarmaService();

        // 1) resolve address
        let address = addressOverride;
        if (!address) {
          if (!normHandle) {
            setError("No handle or address provided");
            return;
          }
          address = await svc.getAddressByTwitterUsername(normHandle);
        }

        if (!address || address === "0x0000000000000000000000000000000000000000") {
          if (!cancelled) {
            setError("User not found in karma system");
            setAddr(null);
          }
          return;
        }

        if (!cancelled) setAddr(address);

        // 2) daily usage (prefer direct getter; else compute from events)
        let _givenToday = 0;
        let _slashedToday = 0;

        try {
          if (typeof svc.getUserUsageToday === "function") {
            const { givenToday, slashedToday } = await svc.getUserUsageToday(address);
            _givenToday = Number(givenToday) || 0;
            _slashedToday = Number(slashedToday) || 0;
          }
        } catch {
          // soft-fail; we’ll compute from events below
        }

        // 3) fetch events (detailed if available)
        let events: KarmaEvent[] = [];
        let detailed = false;

        try {
          if (typeof svc.getRecentKarmaEventsDetailed === "function") {
            events = await svc.getRecentKarmaEventsDetailed(address, { since: sinceCutoff });
            detailed = true;
          } else {
            const all = await svc.getRecentKarmaEvents(address);
            // filter last 24h here
            events = Array.isArray(all)
              ? all.filter((e: any) => Number(e.timestamp) >= sinceCutoff)
              : [];
          }
        } catch (e) {
          console.error("Failed to load events:", e);
          events = [];
        }

        // 4) If no direct daily usage, compute from events (relative types)
        if (_givenToday === 0 || _slashedToday === 0) {
          let g = _givenToday;
          let s = _slashedToday;

          for (const e of events) {
            const t = (e.type || "").toLowerCase();
            if (t === "given") g += amt(e);
            if (t === "slashed") s += amt(e);
          }

          _givenToday = g;
          _slashedToday = s;
        }

        // 5) top pairs — we try best-effort based on event shape:
        // Expecting fields like {from,to} or {slasher,victim} or generic {counterparty, direction}
        const me = toLower(address);
        const outGiven = new Map<string, number>();     // you -> recipient
        const outSlashed = new Map<string, number>();   // you -> victim
        const inGiven = new Map<string, number>();      // other -> you
        const inSlashed = new Map<string, number>();    // other -> you

        for (const e of events) {
          const t = (e.type || "").toLowerCase();
          const a = amt(e);

          // Try to deduce counterparties
          const f = toLower((e as any).from);
          const taddr = toLower((e as any).to);
          const sl = toLower((e as any).slasher);
          const v = toLower((e as any).victim);
          const cp = toLower((e as any).counterparty);
          const dir = (e as any).direction; // 'in' | 'out' ?

          if (t === "given") {
            if (f === me && taddr) add(outGiven, taddr, a);
            else if (dir === "out" && cp) add(outGiven, cp, a);
            else if (taddr === me && f) add(inGiven, f, a);
            else if (dir === "in" && cp) add(inGiven, cp, a);
          } else if (t === "slashed") {
            if (sl === me && v) add(outSlashed, v, a);
            else if (dir === "out" && cp) add(outSlashed, cp, a);
            else if (v === me && sl) add(inSlashed, sl, a);
            else if (dir === "in" && cp) add(inSlashed, cp, a);
          }
        }

        // turn maps into sorted arrays
        const toSorted = (m: Map<string, number>) =>
          Array.from(m.entries())
            .map(([address, total]) => ({ address, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, topN);

        if (!cancelled) {
          setGivenToday(Math.floor(_givenToday));
          setSlashedToday(Math.floor(_slashedToday));
          setTopGiven(toSorted(outGiven));
          setTopSlashed(toSorted(outSlashed));
          setTopReceived(toSorted(inGiven));
          setTopVictim(toSorted(inSlashed));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Failed to compute today's data");
          setAddr(null);
          setGivenToday(0);
          setSlashedToday(0);
          setTopGiven([]);
          setTopSlashed([]);
          setTopReceived([]);
          setTopVictim([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [normHandle, addressOverride, sinceCutoff, topN]);

  // ---------------- RENDER ----------------
  if (loading) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            TODAY
          </div>
          <div className="text-lg font-black">LOADING…</div>
        </div>
      </Card>
    );
  }

  if (error || !addr) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            TODAY
          </div>
          <div className="text-lg font-black text-destructive">
            {error || "User not found"}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Daily usage */}
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
            TODAY&apos;S USAGE
          </div>

          {/* Given */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Given</span>
              <span>
                {givenToday} / {GIVE_LIMIT_PER_DAY}
              </span>
            </div>
            <div className="h-2 bg-muted rounded">
              <div
                className="h-2 rounded bg-foreground/80"
                style={{ width: `${pct(givenToday, GIVE_LIMIT_PER_DAY)}%` }}
              />
            </div>
          </div>

          {/* Slashed */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Slashed</span>
              <span>
                {slashedToday} / {SLASH_LIMIT_PER_DAY}
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

      {/* Top counterparties today */}
      {(topGiven.length ||
        topSlashed.length ||
        topReceived.length ||
        topVictim.length) ? (
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-4">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
              TOP PAIRS (LAST 24H)
            </div>

            {/* You gave to */}
            {topGiven.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-bold mb-1">You gave to</div>
                <div className="space-y-2">
                  {topGiven.map((p, i) => (
                    <div key={`g-${p.address}-${i}`} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {p.address.slice(0, 6)}…{p.address.slice(-4)}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-black border-karma-positive text-karma-positive">
                        +{Math.floor(p.total)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* You slashed */}
            {topSlashed.length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="mb-3">
                  <div className="text-xs font-bold mb-1">You slashed</div>
                  <div className="space-y-2">
                    {topSlashed.map((p, i) => (
                      <div key={`s-${p.address}-${i}`} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {p.address.slice(0, 6)}…{p.address.slice(-4)}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-karma-negative text-karma-negative">
                          -{Math.floor(p.total)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* You received from */}
            {topReceived.length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="mb-3">
                  <div className="text-xs font-bold mb-1">You received from</div>
                  <div className="space-y-2">
                    {topReceived.map((p, i) => (
                      <div key={`r-${p.address}-${i}`} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {p.address.slice(0, 6)}…{p.address.slice(-4)}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-karma-positive text-karma-positive">
                          +{Math.floor(p.total)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* You were slashed by */}
            {topVictim.length > 0 && (
              <>
                <Separator className="my-2" />
                <div>
                  <div className="text-xs font-bold mb-1">You were slashed by</div>
                  <div className="space-y-2">
                    {topVictim.map((p, i) => (
                      <div key={`v-${p.address}-${i}`} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {p.address.slice(0, 6)}…{p.address.slice(-4)}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-karma-negative text-karma-negative">
                          -{Math.floor(p.total)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-4 text-center text-xs text-muted-foreground">
            No activity in the last 24 hours.
          </div>
        </Card>
      )}
    </div>
  );
}