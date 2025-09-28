// KarmaAdmin.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { KarmaService, type KarmaEvent } from "@/services/KarmaService";
import { WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS } from "@/constants/contract";

/**
 * Optional methods KarmaService may expose (all are soft-optional):
 * - getChainInfo(): Promise<{ chainId: number; name?: string }>
 * - getOwner(): Promise<string>
 * - getLastUpdated(): Promise<number>   // unix seconds
 * - getAllUsers(): Promise<string[]>
 * - getAllUsersLength(): Promise<number>
 * - getMaintenanceEvents(): Promise<Array<{ type: "dailyReset"|"redistributed"; timestamp: number; userCount?: number }>>
 * - getAllKarmaEventsDetailed(): Promise<KarmaEvent[]>
 * - getAllKarmaEvents(): Promise<KarmaEvent[]>
 */

const GIVE_LIMIT_PER_DAY = 30;
const SLASH_LIMIT_PER_DAY = 20;
const PER_PAIR_SLASH_LIMIT = 5;

type Maint = { type: "dailyReset" | "redistributed"; timestamp: number; userCount?: number };

export default function KarmaAdmin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chainId, setChainId] = useState<number | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [contractAddr] = useState<string>(WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS || "—");

  const [owner, setOwner] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [eventsCount, setEventsCount] = useState<number | null>(null);

  const [lastReset, setLastReset] = useState<Maint | null>(null);
  const [lastRedistribution, setLastRedistribution] = useState<Maint | null>(null);

  const short = (a?: string) =>
    a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? "—";

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const svc: any = new KarmaService();

        // Chain / Contract
        try {
          if (typeof svc.getChainInfo === "function") {
            const info = await svc.getChainInfo();
            if (!cancelled) {
              setChainId(info?.chainId ?? null);
              setChainName(info?.name ?? null);
            }
          }
        } catch {
          /* ignore */
        }

        // Owner / lastUpdated (contract doesn't expose; keep soft-optional)
        try {
          if (typeof svc.getOwner === "function") {
            const o = await svc.getOwner();
            if (!cancelled) setOwner(o || null);
          }
        } catch {
          /* ignore */
        }

        try {
          if (typeof svc.getLastUpdated === "function") {
            const lu = await svc.getLastUpdated();
            if (!cancelled) setLastUpdated(typeof lu === "number" ? lu : null);
          }
        } catch {
          /* ignore */
        }

        // Users count (PREFER getAllUsers, then fallback)
        let uCount: number | null = null;
        try {
          if (typeof svc.getAllUsers === "function") {
            const arr = await svc.getAllUsers();
            if (Array.isArray(arr)) uCount = arr.length;
          }
          if ((uCount == null || uCount === 0) && typeof svc.getAllUsersLength === "function") {
            const len = await svc.getAllUsersLength();
            if (Number.isFinite(len)) uCount = Number(len);
          }
        } catch {
          /* ignore */
        }

        // Events count + unique users fallback (only if needed)
        let evCount: number | null = null;
        if (uCount == null || uCount === 0) {
          try {
            let evs: KarmaEvent[] | null = null;
            if (typeof svc.getAllKarmaEventsDetailed === "function") {
              evs = await svc.getAllKarmaEventsDetailed();
            } else if (typeof svc.getAllKarmaEvents === "function") {
              evs = await svc.getAllKarmaEvents();
            }
            if (Array.isArray(evs)) {
              evCount = evs.length;
              // rough unique participant count from events
              const uniq = new Set<string>();
              for (const e of evs) {
                const addrs = [
                  (e as any).from,
                  (e as any).to,
                  (e as any).slasher,
                  (e as any).victim,
                ].filter(Boolean) as string[];
                addrs.forEach((a) => uniq.add(a.toLowerCase()));
              }
              if (!uCount) uCount = uniq.size || null;
            }
          } catch {
            /* ignore */
          }
        }

        if (!cancelled) {
          setUsersCount(uCount);
          setEventsCount(evCount);
        }

        // Maintenance (if your service ever exposes)
        try {
          if (typeof svc.getMaintenanceEvents === "function") {
            const ms: Maint[] = await svc.getMaintenanceEvents();
            if (Array.isArray(ms) && ms.length) {
              const lastR = [...ms].filter((m) => m.type === "dailyReset").sort((a, b) => b.timestamp - a.timestamp)[0];
              const lastD = [...ms].filter((m) => m.type === "redistributed").sort((a, b) => b.timestamp - a.timestamp)[0];
              if (!cancelled) {
                setLastReset(lastR || null);
                setLastRedistribution(lastD || null);
              }
            }
          }
        } catch {
          /* ignore */
        }
      } catch (e: any) {
        console.error("[KarmaAdmin] error:", e);
        if (!cancelled) setError(e?.message || "Failed to load admin data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const chainLabel =
    chainId === 480 ? "World Chain" : chainName || "—";

  // ---------- RENDER ----------
  if (loading) {
    return (
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            ADMIN / SYSTEM
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
            ADMIN / SYSTEM
          </div>
          <div className="text-lg font-black text-destructive">{error}</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Summary */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-strong">
        <div className="space-y-3">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            SYSTEM
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">Chain</span>
              <span className="text-xs text-muted-foreground">
                {chainLabel} {chainId != null ? `(id ${chainId})` : ""}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">Contract</span>
              <span className="text-xs mono-truncate">{short(contractAddr)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Parameters / Limits */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
          PARAMETERS
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Daily Give Limit</span>
            <Badge variant="outline" className="text-[10px] px-2 py-[2px]">
              {GIVE_LIMIT_PER_DAY}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Daily Slash Limit</span>
            <Badge variant="outline" className="text-[10px] px-2 py-[2px]">
              {SLASH_LIMIT_PER_DAY}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Per-pair Slash Limit</span>
            <Badge variant="outline" className="text-[10px] px-2 py-[2px]">
              {PER_PAIR_SLASH_LIMIT}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
          STATS
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-[10px] font-bold text-muted-foreground">USERS</div>
            <div className="text-base font-black">{usersCount ?? "—"}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}