// KarmaDirectory.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KarmaService, type KarmaEvent } from "@/services/KarmaService";

type SortKey = "karma" | "received" | "net" | "slashed" | "handle" | "address";

interface Props {
  pageSize?: number;     // default 20
  maxScan?: number;      // limit when deriving from events (default 400 unique users)
}

type DirectoryUser = {
  address: string;
  isRegistered?: boolean;
  karma?: number;
  totalReceived?: number;
  totalSlashed?: number;
  twitter?: string;
  github?: string;
  discord?: string;
};

const short = (a?: string) =>
  a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "—";
const lower = (s?: string) => (s ? s.toLowerCase() : s);
const num = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

export default function KarmaDirectory({ pageSize = 20, maxScan = 400 }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rawUsers, setRawUsers] = useState<DirectoryUser[]>([]);

  // UI state
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("karma");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(Math.max(5, pageSize));

  // --- data load ---
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setPage(1);

      const svc: any = new KarmaService();

      // 1) Build candidate address set
      const addrs = new Set<string>();

      // Try direct allUsers first
      let usedDirect = false;
      try {
        if (typeof svc.getAllUsers === "function") {
          const arr: string[] = await svc.getAllUsers();
          if (Array.isArray(arr) && arr.length) {
            arr.forEach((a) => a && addrs.add(a.toLowerCase()));
            usedDirect = true;
          }
        } else if (typeof svc.getAllUsersLength === "function" && typeof svc.getAllUsersAt === "function") {
          const len = await svc.getAllUsersLength();
          for (let i = 0; i < Math.min(2000, Number(len)); i++) {
            const a = await svc.getAllUsersAt(i);
            if (a) addrs.add(a.toLowerCase());
          }
          usedDirect = addrs.size > 0;
        }
      } catch {
        // fall through to events
      }

      // Fallback: derive from events (givers/recipients/slashers/victims)
      if (!usedDirect) {
        const tryLoad = async (name: string): Promise<KarmaEvent[] | null> => {
          try {
            if (typeof svc[name] === "function") {
              const out = await svc[name]();
              if (Array.isArray(out)) return out;
            }
          } catch {}
          return null;
        };
        const events =
          (await tryLoad("getAllKarmaEventsDetailed")) ||
          (await tryLoad("getAllKarmaEvents")) ||
          (await tryLoad("getRecentKarmaEventsDetailed")) ||
          (await tryLoad("getRecentKarmaEvents")) ||
          [];

        for (const e of events) {
          const cand = [
            (e as any).from,
            (e as any).to,
            (e as any).slasher,
            (e as any).victim,
          ];
          for (const c of cand) {
            if (c && typeof c === "string") addrs.add(c.toLowerCase());
          }
          if (addrs.size >= maxScan) break;
        }
      }

      // Cap to keep RPCs reasonable
      const addresses = Array.from(addrs).slice(0, maxScan);

      // 2) Fetch per-user details in small concurrent batches
      const chunk = <T,>(arr: T[], n: number) =>
        Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

      const batches = chunk(addresses, 10);
      const collected: DirectoryUser[] = [];

      try {
        for (const group of batches) {
          const jobs = group.map(async (a) => {
            let karma = 0;
            let isReg: boolean | undefined;
            let totalReceived: number | undefined;
            let totalSlashed: number | undefined;
            let twitter = "";
            let github = "";
            let discord = "";

            try {
              if (typeof svc.getUserKarmaData === "function") {
                const d = await svc.getUserKarmaData(a);
                // normalize
                karma = num((d as any).karma);
                isReg = Boolean((d as any).isRegistered);
                const sc = (d as any).socialConnections || {};
                twitter = sc.twitterUsername || "";
                github = sc.githubUsername || "";
                discord = sc.discordUsername || "";
              } else {
                // fine-grained getters
                if (typeof svc.getKarma === "function") karma = num(await svc.getKarma(a));
                if (typeof svc.getIsRegistered === "function") isReg = Boolean(await svc.getIsRegistered(a));
                if (typeof svc.getSocialConnections === "function") {
                  const sc = await svc.getSocialConnections(a);
                  twitter = sc?.twitterUsername || "";
                  github = sc?.githubUsername || "";
                  discord = sc?.discordUsername || "";
                }
              }

              // totals (optional)
              if (typeof svc.getUserTotals === "function") {
                const t = await svc.getUserTotals(a);
                totalReceived = num(t?.totalReceived);
                totalSlashed = num(t?.totalSlashed);
              } else {
                if (typeof svc.getTotalReceived === "function") {
                  totalReceived = num(await svc.getTotalReceived(a));
                }
                if (typeof svc.getTotalSlashed === "function") {
                  totalSlashed = num(await svc.getTotalSlashed(a));
                }
              }
            } catch {
              // ignore per-user failure
            }

            return {
              address: a,
              isRegistered: isReg,
              karma,
              totalReceived,
              totalSlashed,
              twitter,
              github,
              discord,
            } as DirectoryUser;
          });

          const res = await Promise.allSettled(jobs);
          for (const r of res) {
            if (r.status === "fulfilled") collected.push(r.value);
          }
        }

        if (!cancelled) setRawUsers(collected);
      } catch (e: any) {
        console.error("[KarmaDirectory] load error:", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load directory");
          setRawUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [pageSize, maxScan]);

  // --- filters & sorting ---
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return rawUsers;
    return rawUsers.filter((u) => {
      const hay = [
        u.twitter ? `@${u.twitter}` : "",
        u.github || "",
        u.discord || "",
        u.address || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(ql);
    });
  }, [rawUsers, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const score = (u: DirectoryUser, k: SortKey) => {
      if (k === "karma") return num(u.karma);
      if (k === "received") return num(u.totalReceived);
      if (k === "slashed") return num(u.totalSlashed);
      if (k === "net") return num(u.totalReceived) - num(u.totalSlashed);
      return 0;
    };
    if (sort === "handle") {
      arr.sort((a, b) => (lower(a.twitter || "") || "").localeCompare(lower(b.twitter || "") || ""));
    } else if (sort === "address") {
      arr.sort((a, b) => (a.address || "").localeCompare(b.address || ""));
    } else {
      arr.sort((a, b) => score(b, sort) - score(a, sort));
    }
    return arr;
  }, [filtered, sort]);

  // pagination
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const pageSafe = Math.min(Math.max(1, page), pageCount);
  const start = (pageSafe - 1) * size;
  const end = Math.min(total, start + size);
  const rows = sorted.slice(start, end);

  // --- render ---
  if (loading) {
    return (
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            DIRECTORY / LEADERBOARD
          </div>
          <div className="text-lg font-black">LOADING…</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            DIRECTORY / LEADERBOARD
          </div>
          <div className="text-lg font-black text-destructive">{error}</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-strong">
        <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
          BROWSE
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] font-bold text-muted-foreground">SEARCH</label>
          <input
            className="text-xs border px-2 py-1 rounded"
            placeholder="@handle or 0x…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />

          <label className="text-[10px] font-bold text-muted-foreground">SORT BY</label>
          <select
            className="text-xs border px-2 py-1 rounded"
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
          >
            <option value="karma">Karma (desc)</option>
            <option value="received">Received (desc)</option>
            <option value="net">Net (desc)</option>
            <option value="slashed">Slashed (desc)</option>
            <option value="handle">Handle (A–Z)</option>
            <option value="address">Address (A–Z)</option>
          </select>

          <label className="text-[10px] font-bold text-muted-foreground">PAGE SIZE</label>
          <select
            className="text-xs border px-2 py-1 rounded"
            value={size}
            onChange={(e) => { setSize(Math.max(5, parseInt(e.target.value) || 10)); setPage(1); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>
      </Card>

      {/* List */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
          LEADERBOARD
        </div>

        {rows.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground">No users found.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((u, i) => {
              const rank = start + i + 1;
              const karma = num(u.karma);
              const received = num(u.totalReceived);
              const slashed = num(u.totalSlashed);
              const net = received - slashed;

              return (
                <div key={`${u.address}-${rank}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] px-2 py-[2px]">
                        #{rank}
                      </Badge>
                      <div className="min-w-0">
                        <div className="text-xs font-black mono-truncate">
                          {u.twitter ? `@${u.twitter}` : short(u.address)}
                        </div>
                        <div className="text-[10px] text-muted-foreground mono-truncate">
                          {short(u.address)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-black ${karma > 500 ? "text-karma-positive" : karma < 100 ? "text-karma-negative" : "text-karma-neutral"}`}>
                        {Math.floor(karma)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {received ? `+${Math.floor(received)}` : "+0"} / {slashed ? `-${Math.floor(slashed)}` : "-0"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="mono-truncate">
                      {u.github ? `gh:${u.github}` : u.discord ? `dc:${u.discord}` : u.isRegistered ? "registered" : "—"}
                    </span>
                    <span className={`font-bold ${net > 0 ? "text-karma-positive" : net < 0 ? "text-karma-negative" : "text-karma-neutral"}`}>
                      net {net >= 0 ? "+" : ""}{Math.floor(net)}
                    </span>
                  </div>

                  {i < rows.length - 1 && <Separator className="my-2" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {total === 0 ? "0–0 of 0" : `${start + 1}–${end} of ${total}`}
          </span>
          <div className="flex gap-2">
            <button
              className="px-2 py-[2px] border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <button
              className="px-2 py-[2px] border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}