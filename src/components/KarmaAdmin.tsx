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
 * - getAllUsersLength(): Promise<number>
 * - getAllUsers(): Promise<string[]>
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
  const [contractAddr, setContractAddr] = useState<string>(WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS || "—");

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
          setContractAddr(
            typeof svc.getContractAddress === "function"
              ? (await svc.getContractAddress()) || contractAddr
              : contractAddr
          );
        } catch {}

        try {
          if (typeof svc.getChainInfo === "function") {
            const info = await svc.getChainInfo();
            if (!cancelled) {
              setChainId(info?.chainId ?? null);
              setChainName(info?.name ?? null);
            }
          }
        } catch {}

        // Owner / lastUpdated (soft-optional; your current contract doesn't expose them publicly)
        try {
          if (typeof svc.getOwner === "function") {
            const o = await svc.getOwner();
            if (!cancelled) setOwner(o || null);
          }
        } catch {}

        try {
          if (typeof svc.getLastUpdated === "function") {
            const lu = await svc.getLastUpdated();
            if (!cancelled) setLastUpdated(typeof lu === "number" ? lu : null);
          }
        } catch {}

        // Users count (prefer direct, else infer from events)
        let uCount: number | null = null;
        try {
          if (typeof svc.getAllUsersLength === "function") {
            uCount = await svc.getAllUsersLength();
          } else if (typeof svc.getAllUsers === "function") {
            const arr = await svc.getAllUsers();
            uCount = Array.isArray(arr) ? arr.length : null;
          }
        } catch {}

        // Events count + unique users fallback
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
          } catch {}
        }
        if (!cancelled) {
          setUsersCount(uCount);
          setEventsCount(evCount);
        }

        // Maintenance (if your contract emits or service exposes)
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
        } catch {}

      } catch (e: any) {
        console.error("[KarmaAdmin] error:", e);
        if (!cancelled) setError(e?.message || "Failed to load admin data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

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
                {chainName || "—"} {chainId != null ? `(id ${chainId})` : ""}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">Contract</span>
              <span className="text-xs mono-truncate">{short(contractAddr)}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">Owner</span>
              <span className="text-xs mono-truncate">{owner ? short(owner) : "—"}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">Last Updated</span>
              <span className="text-xs text-muted-foreground">
                {lastUpdated ? new Date(lastUpdated * 1000).toLocaleString() : "—"}
              </span>
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
          <div className="text-center">
            <div className="text-[10px] font-bold text-muted-foreground">EVENTS</div>
            <div className="text-base font-black">{eventsCount ?? "—"}</div>
          </div>
        </div>
      </Card>

      {/* Maintenance */}
      <Card className="border-2 border-border bg-card card-rounded card-pad shadow-sharp">
        <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
          MAINTENANCE
        </div>

        {/* If neither available, show a friendly note */}
        {!lastReset && !lastRedistribution ? (
          <div className="text-center text-xs text-muted-foreground">
            No maintenance events found (your contract may not emit them yet).
          </div>
        ) : (
          <div className="space-y-3">
            {lastReset && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold">Last Daily Reset</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(lastReset.timestamp * 1000).toLocaleString()}
                  {typeof lastReset.userCount === "number" ? ` • users: ${lastReset.userCount}` : ""}
                </span>
              </div>
            )}

            {lastRedistribution && (
              <>
                <Separator className="my-1" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold">Last Redistribution</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(lastRedistribution.timestamp * 1000).toLocaleString()}
                    {typeof lastRedistribution.userCount === "number" ? ` • users: ${lastRedistribution.userCount}` : ""}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}