// KarmaAllTime.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KarmaService, type KarmaEvent } from "@/services/KarmaService";

/**
 * All-time view for a user.
 *
 * Tries these KarmaService methods if present:
 * - getAddressByTwitterUsername(handle)
 * - getUserTotals(address) -> { totalReceived, totalSlashed }
 * - getAllKarmaEventsDetailed(address) -> KarmaEvent[]  (preferred)
 * - getAllKarmaEvents(address) -> KarmaEvent[]          (OK)
 * - getRecentKarmaEventsDetailed(address)               (fallback)
 * - getRecentKarmaEvents(address)                       (last-ditch fallback)
 */
interface Props {
  twitterUsername?: string | null;
  addressOverride?: string | null;
  topN?: number; // how many counterparties to show
}

type PairAgg = { address: string; total: number };

export default function KarmaAllTime({
  twitterUsername = null,
  addressOverride = null,
  topN = 5,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [addr, setAddr] = useState<string | null>(addressOverride ?? null);
  const [error, setError] = useState<string | null>(null);

  const [totalReceived, setTotalReceived] = useState(0);
  const [totalSlashed, setTotalSlashed] = useState(0);
  const [firstSeen, setFirstSeen] = useState<number | null>(null);

  const [topGivers, setTopGivers] = useState<PairAgg[]>([]);
  const [topRecipients, setTopRecipients] = useState<PairAgg[]>([]);

  const normHandle = useMemo(
    () => (twitterUsername ? twitterUsername.replace(/^@/, "").trim().toLowerCase() : null),
    [twitterUsername]
  );

  const toLower = (s?: string) => (s ? s.toLowerCase() : s);
  const n = (v: unknown) =>
    typeof v === "number" ? v : Number.isFinite(parseFloat(String(v))) ? parseFloat(String(v)) : 0;

  const short = (a?: string) =>
    a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "—";

  const toSorted = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([address, total]) => ({ address, total }))
      .sort((a, b) => b.total - a.total);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const svc: any = new KarmaService();

        // 1) Resolve address
        let address = addressOverride;
        if (!address) {
          if (!normHandle) {
            throw new Error("No handle or address provided");
          }
          address = await svc.getAddressByTwitterUsername(normHandle);
        }
        if (!address || address === "0x0000000000000000000000000000000000000000") {
          throw new Error("User not found in karma system");
        }
        if (!cancelled) setAddr(address);

        // 2) Totals: prefer direct getter
        let _totalReceived = 0;
        let _totalSlashed = 0;

        try {
          if (typeof svc.getUserTotals === "function") {
            const t = await svc.getUserTotals(address);
            _totalReceived = n(t?.totalReceived);
            _totalSlashed = n(t?.totalSlashed);
          }
        } catch {
          // ignore; we'll compute from events
        }

        // 3) Load events (prefer "all", then recent)
        let events: KarmaEvent[] = [];

        const tryLoad = async (name: string, ...args: any[]) => {
          try {
            if (typeof (svc as any)[name] === "function") {
              const out = await (svc as any)[name](...args);
              if (Array.isArray(out) && out.length) return out;
            }
          } catch {
            // ignore and try next
          }
          return null;
        };

        events =
          (await tryLoad("getAllKarmaEventsDetailed", address)) ||
          (await tryLoad("getAllKarmaEvents", address)) ||
          (await tryLoad("getRecentKarmaEventsDetailed", address)) ||
          (await tryLoad("getRecentKarmaEvents", address)) ||
          [];

        // 4) If totals not provided, compute from events (all-time or recent fallback)
        const me = toLower(address);
        const givers = new Map<string, number>(); // other -> you
        const recipients = new Map<string, number>(); // you -> other
        let earliest: number | null = null;

        if (_totalReceived === 0 || _totalSlashed === 0 || events.length) {
          let rcv = _totalReceived;
          let sl = _totalSlashed;

          for (const e of events) {
            const type = String((e as any).type || "").toLowerCase();
            const amt = n((e as any).amount);
            const ts = Number((e as any).timestamp) || 0;

            const from = toLower((e as any).from);
            const to = toLower((e as any).to);
            const slasher = toLower((e as any).slasher);
            const victim = toLower((e as any).victim);
            const cp = toLower((e as any).counterparty);
            const dir = (e as any).direction; // "in" | "out"

            if (!earliest || (ts && ts < earliest)) earliest = ts;

            if (type === "given") {
              // incoming: other -> me
              if (to === me && from) {
                rcv += amt;
                givers.set(from, (givers.get(from) ?? 0) + amt);
              } else if (dir === "in" && cp) {
                rcv += amt;
                givers.set(cp, (givers.get(cp) ?? 0) + amt);
              }

              // outgoing: me -> other
              if (from === me && to) {
                recipients.set(to, (recipients.get(to) ?? 0) + amt);
              } else if (dir === "out" && cp) {
                recipients.set(cp, (recipients.get(cp) ?? 0) + amt);
              }
            } else if (type === "slashed") {
              // slashed (lost) when I'm the victim
              if (victim === me && slasher) {
                sl += amt;
              } else if (dir === "in" && cp) {
                sl += amt;
              }
            }
          }

          _totalReceived = rcv;
          _totalSlashed = sl;
        }

        if (!cancelled) {
          setTotalReceived(Math.floor(_totalReceived));
          setTotalSlashed(Math.floor(_totalSlashed));
          setTopGivers(toSorted(givers).slice(0, topN));
          setTopRecipients(toSorted(recipients).slice(0, topN));
          setFirstSeen(earliest ?? null);
        }
      } catch (e: any) {
        console.error("[KarmaAllTime] error:", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load all-time data");
          setAddr(null);
          setTotalReceived(0);
          setTotalSlashed(0);
          setTopGivers([]);
          setTopRecipients([]);
          setFirstSeen(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [normHandle, addressOverride, topN]);

  const net = totalReceived - totalSlashed;
  const rep =
    totalReceived + totalSlashed > 0
      ? (totalReceived / Math.max(1, totalSlashed)).toFixed(2)
      : "—";

  // ---------------- RENDER ----------------
  if (loading) {
    return (
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            ALL-TIME
          </div>
          <div className="text-lg font-black">LOADING…</div>
        </div>
      </Card>
    );
  }

  if (error || !addr) {
    return (
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            ALL-TIME
          </div>
        </div>
        <div className="text-lg font-black text-destructive text-center">
          {error || "User not found"}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Totals & reputation */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-strong">
        <div className="space-y-3">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            ALL-TIME SUMMARY
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-[10px] font-bold text-muted-foreground">RECEIVED</div>
              <div className="text-base font-black">{totalReceived}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-muted-foreground">SLASHED</div>
              <div className="text-base font-black">{totalSlashed}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-muted-foreground">NET</div>
              <div className={`text-base font-black ${net > 0 ? "text-karma-positive" : net < 0 ? "text-karma-negative" : "text-karma-neutral"}`}>
                {net}
              </div>
            </div>
            <div className="text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-muted-foreground">REPUTATION</div>
              <div className="text-base font-black">{rep}</div>
            </div>
          </div>

          {firstSeen ? (
            <div className="text-center text-[11px] text-muted-foreground">
              First seen: <span className="font-bold">
                {new Date(firstSeen * 1000).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <div className="text-center text-[11px] text-muted-foreground">
              First seen: —
            </div>
          )}
        </div>
      </Card>

      {/* Top counterparties */}
      {(topGivers.length > 0 || topRecipients.length > 0) ? (
        <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
            TOP COUNTERPARTIES (ALL-TIME)
          </div>

          {/* You received from */}
          {topGivers.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold mb-1">Top givers → you</div>
              <div className="space-y-2">
                {topGivers.map((p, i) => (
                  <div key={`giver-${p.address}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground mono-truncate">
                      {short(p.address)}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-black border-karma-positive text-karma-positive whitespace-nowrap px-2 py-[2px]">
                      +{Math.floor(p.total)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* You gave to */}
          {topRecipients.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="mb-1">
                <div className="text-xs font-bold mb-1">Top recipients ← you</div>
                <div className="space-y-2">
                  {topRecipients.map((p, i) => (
                    <div key={`recip-${p.address}-${i}`} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground mono-truncate">
                        {short(p.address)}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-black border-karma-positive text-karma-positive whitespace-nowrap px-2 py-[2px]">
                        +{Math.floor(p.total)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Card>
      ) : (
        <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
          <div className="text-center text-xs text-muted-foreground">
            No all-time counterparties found.
          </div>
        </Card>
      )}
    </div>
  );
}