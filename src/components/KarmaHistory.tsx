// KarmaHistory.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KarmaService, type KarmaEvent } from "@/services/KarmaService";

interface Props {
  twitterUsername?: string | null;
  addressOverride?: string | null;
  pageSize?: number; // default 20
}

type Direction = "in" | "out";
type Kind = "given" | "slashed";

type NormalizedEvent = {
  kind: Kind;
  direction: Direction;          // relative to "me"
  amount: number;                // signed impact on me (+ in, - out); for slasher: -amount/5
  rawAmount: number;             // raw event amount
  counterparty?: string;         // other address
  timestamp: number;
  reason?: string;
  // metadata for slashing fee
  feeNote?: string;              // e.g., "fee 20% (-X)"
};

const toLower = (s?: string) => (s ? s.toLowerCase() : s);
const num = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};
const short = (a?: string) =>
  a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "—";
const fmtDate = (ts: number) => new Date(ts * 1000).toLocaleDateString();

export default function KarmaHistory({
  twitterUsername = null,
  addressOverride = null,
  pageSize = 20,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [addr, setAddr] = useState<string | null>(addressOverride ?? null);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<NormalizedEvent[]>([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | Kind>("all");
  const [dirFilter, setDirFilter] = useState<"all" | Direction>("all");
  const [q, setQ] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState<string>("");     // yyyy-mm-dd

  // Pagination
  const [page, setPage] = useState(1);

  const normHandle = useMemo(
    () => (twitterUsername ? twitterUsername.replace(/^@/, "").trim().toLowerCase() : null),
    [twitterUsername]
  );

  // quick range helpers
  const quickSetRange = (days: number | "all") => {
    if (days === "all") {
      setFromDate("");
      setToDate("");
      return;
    }
    const now = new Date();
    const toISO = (d: Date) => d.toISOString().slice(0, 10);
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    setFromDate(toISO(start));
    setToDate(toISO(now));
  };

  // Normalize raw events into our shape
  const normalize = (raw: KarmaEvent, me: string): NormalizedEvent | null => {
    const kind = String((raw as any).type || "").toLowerCase() as Kind;
    if (kind !== "given" && kind !== "slashed") return null;

    const ts = Number((raw as any).timestamp) || 0;
    const amt = num((raw as any).amount);

    const from = toLower((raw as any).from);
    const to = toLower((raw as any).to);
    const slasher = toLower((raw as any).slasher);
    const victim = toLower((raw as any).victim);
    const cp = toLower((raw as any).counterparty);
    const dirProp = (raw as any).direction as Direction | undefined;
    const msg = (raw as any).reason;

    let direction: Direction | null = null;
    let counterparty: string | undefined;
    let signed = 0;
    let feeNote: string | undefined;

    if (kind === "given") {
      // Incoming: someone gave me -> +amount
      if (to === me && from) {
        direction = "in";
        counterparty = from;
        signed = +amt;
      }
      // Outgoing: I gave someone -> -amount
      else if (from === me && to) {
        direction = "out";
        counterparty = to;
        signed = -amt;
      }
      // Try generic fields from service
      else if (dirProp && cp) {
        direction = dirProp;
        counterparty = cp;
        signed = dirProp === "in" ? +amt : -amt;
      }
    } else if (kind === "slashed") {
      // I am victim -> I lose full amount
      if (victim === me && slasher) {
        direction = "out";
        counterparty = slasher;
        signed = -amt;
      }
      // I am slasher -> I pay amt/5 (20% fee)
      else if (slasher === me && victim) {
        direction = "out";
        counterparty = victim;
        signed = -(amt / 5);
        feeNote = `fee 20% (-${Math.floor(amt / 5)})`;
      }
      // Fallback to generic
      else if (dirProp && cp) {
        direction = dirProp;
        counterparty = cp;
        signed = dirProp === "in" ? +amt : -amt; // best-effort
      }
    }

    if (!direction) return null;
    return {
      kind,
      direction,
      amount: signed,
      rawAmount: amt,
      counterparty,
      timestamp: ts,
      reason: msg,
      feeNote,
    };
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setPage(1);

      try {
        const svc: any = new KarmaService();

        // 1) resolve address
        let address = addressOverride;
        if (!address) {
          if (!normHandle) throw new Error("No handle or address provided");
          address = await svc.getAddressByTwitterUsername(normHandle);
        }
        if (!address || address === "0x0000000000000000000000000000000000000000") {
          throw new Error("User not found in karma system");
        }
        if (!cancelled) setAddr(address);

        // 2) fetch events with fallbacks (prefer "all" then "recent")
        const tryLoad = async (name: string, ...args: any[]): Promise<KarmaEvent[] | null> => {
          try {
            if (typeof (svc as any)[name] === "function") {
              const out = await (svc as any)[name](...args);
              if (Array.isArray(out)) return out;
            }
          } catch { /* noop */ }
          return null;
        };

        const all =
          (await tryLoad("getAllKarmaEventsDetailed", address)) ||
          (await tryLoad("getAllKarmaEvents", address)) ||
          (await tryLoad("getRecentKarmaEventsDetailed", address)) ||
          (await tryLoad("getRecentKarmaEvents", address)) ||
          [];

        // 3) normalize
        const me = toLower(address!);
        const norm: NormalizedEvent[] = (all as KarmaEvent[])
          .map((e) => normalize(e, me))
          .filter(Boolean) as NormalizedEvent[];

        // newest first
        norm.sort((a, b) => b.timestamp - a.timestamp);

        if (!cancelled) setEvents(norm);
      } catch (e: any) {
        console.error("[KarmaHistory] failed:", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load history");
          setAddr(null);
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [normHandle, addressOverride]);

  // Apply filters
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromTs = fromDate ? Math.floor(new Date(fromDate + "T00:00:00Z").getTime() / 1000) : 0;
    const toTs = toDate ? Math.floor(new Date(toDate + "T23:59:59Z").getTime() / 1000) : 0;

    return events.filter((e) => {
      if (typeFilter !== "all" && e.kind !== typeFilter) return false;
      if (dirFilter !== "all" && e.direction !== dirFilter) return false;
      if (ql && !(e.reason || "").toLowerCase().includes(ql)) return false;
      if (fromTs && e.timestamp < fromTs) return false;
      if (toTs && e.timestamp > toTs) return false;
      return true;
    });
  }, [events, typeFilter, dirFilter, q, fromDate, toDate]);

  // Pagination derived values
  const pSize = Math.max(5, pageSize);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pSize));
  const pageSafe = Math.min(Math.max(1, page), pageCount);
  const startIdx = (pageSafe - 1) * pSize;
  const endIdx = Math.min(total, startIdx + pSize);
  const pageItems = filtered.slice(startIdx, endIdx);

  // ---------------- RENDER ----------------

  if (loading) {
    return (
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            HISTORY
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
            HISTORY
          </div>
          <div className="text-lg font-black text-destructive">{error || "User not found"}</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-strong">
        <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
          FILTERS
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Type */}
          <label className="text-[10px] font-bold text-muted-foreground">TYPE</label>
          <select
            className="text-xs border px-2 py-1 rounded"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as any); setPage(1); }}
          >
            <option value="all">All</option>
            <option value="given">Given</option>
            <option value="slashed">Slashed</option>
          </select>

          {/* Direction */}
          <label className="text-[10px] font-bold text-muted-foreground">DIRECTION</label>
          <select
            className="text-xs border px-2 py-1 rounded"
            value={dirFilter}
            onChange={(e) => { setDirFilter(e.target.value as any); setPage(1); }}
          >
            <option value="all">All</option>
            <option value="in">Incoming</option>
            <option value="out">Outgoing</option>
          </select>

          {/* From */}
          <label className="text-[10px] font-bold text-muted-foreground">FROM</label>
          <input
            type="date"
            className="text-xs border px-2 py-1 rounded"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          />

          {/* To */}
          <label className="text-[10px] font-bold text-muted-foreground">TO</label>
          <input
            type="date"
            className="text-xs border px-2 py-1 rounded"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          />

          {/* Search (full width) */}
          <label className="text-[10px] font-bold text-muted-foreground col-span-2">REASON CONTAINS</label>
          <input
            type="text"
            placeholder="e.g. shipped PR #42"
            className="text-xs border px-2 py-1 rounded col-span-2"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>

        {/* Quick ranges + Reset */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="text-[10px] px-2 py-[2px] border rounded"
            onClick={() => quickSetRange(7)}
          >
            Last 7d
          </button>
          <button
            className="text-[10px] px-2 py-[2px] border rounded"
            onClick={() => quickSetRange(30)}
          >
            Last 30d
          </button>
          <button
            className="text-[10px] px-2 py-[2px] border rounded"
            onClick={() => quickSetRange("all")}
          >
            All
          </button>

          <button
            className="ml-auto text-[10px] px-2 py-[2px] border rounded"
            onClick={() => {
              setTypeFilter("all");
              setDirFilter("all");
              setFromDate("");
              setToDate("");
              setQ("");
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
      </Card>

      {/* List */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
          TIMELINE
        </div>

        {pageItems.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground">No events match your filters.</div>
        ) : (
          <div className="space-y-3">
            {pageItems.map((e, i) => {
              const sign = e.amount > 0 ? "+" : e.amount < 0 ? "−" : "";
              const isGiven = e.kind === "given";
              const tone =
                e.amount > 0
                  ? "border-karma-positive text-karma-positive"
                  : e.amount < 0
                  ? "border-karma-negative text-karma-negative"
                  : "border-border";

              // label for counterparty depending on kind/direction
              let cpLabel = "counterparty";
              if (isGiven) cpLabel = e.direction === "out" ? "to" : "from";
              else cpLabel = e.direction === "out" ? "by / victim" : "by";

              return (
                <div key={`${e.kind}-${e.timestamp}-${i}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`whitespace-nowrap text-[10px] px-2 py-[2px] font-black ${tone}`}
                    >
                      {isGiven ? "GIVE" : "SLASH"} {sign}{Math.floor(Math.abs(e.amount))}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{fmtDate(e.timestamp)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{cpLabel}</span>
                    <span className="text-xs mono-truncate">{short(e.counterparty)}</span>
                  </div>

                  {e.feeNote && (
                    <div className="text-[10px] text-muted-foreground">({e.feeNote})</div>
                  )}

                  {e.reason && (
                    <div className="text-xs text-muted-foreground wrap-balance">"{e.reason}"</div>
                  )}

                  {i < pageItems.length - 1 && <Separator className="my-2" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {total === 0 ? "0–0 of 0" : `${startIdx + 1}–${endIdx} of ${total}`}
          </span>
          <div className="flex gap-2">
            <button
              className="px-2 py-[2px] border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
            >
              Prev
            </button>
            <button
              className="px-2 py-[2px] border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={pageSafe >= pageCount}
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}