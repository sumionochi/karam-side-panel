// src/pages/HistoryPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionItem } from "@/components/TransactionItem";
import { mockTransactions, mockCurrentUser } from "@/lib/mockData";
import { Filter, Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { KarmaTransaction, User } from "@/types/karma";
import { tsToMs, tsToIso } from "@/lib/time";
import { publicClient } from "@/lib/contracts";
import { parseAbi, parseAbiItem, type Address, type Hash } from "viem";

/* ────────────────────────────────────────────────────────────────────
 * ENV / Contract
 * ──────────────────────────────────────────────────────────────────── */
const KARAM_ADDRESS = import.meta.env.VITE_KARAM_ADDRESS as `0x${string}`;
const FROM_BLOCK: bigint = (() => {
  const v = import.meta.env.VITE_HISTORY_FROM_BLOCK as string | undefined;
  const n = v ? BigInt(v) : 0n;
  return n >= 0n ? n : 0n;
})();

/** Individual event fragments for getLogs convenience */
const EV_KARMA_GIVEN = parseAbiItem(
  "event KarmaGiven(address indexed from, address indexed to, uint256 amount, string reason, uint256 timestamp)"
);
const EV_KARMA_SLASHED = parseAbiItem(
  "event KarmaSlashed(address indexed slasher, address indexed victim, uint256 amount, string reason, uint256 timestamp)"
);

/** Minimal ABI for watchContractEvent typing */
const EVENTS_ABI = parseAbi([
  "event KarmaGiven(address indexed from, address indexed to, uint256 amount, string reason, uint256 timestamp)",
  "event KarmaSlashed(address indexed slasher, address indexed victim, uint256 amount, string reason, uint256 timestamp)",
] as const);

/* ────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────── */
async function getSelfAddress(): Promise<Address | null> {
  const eth = (window as any)?.ethereum;
  if (!eth) return null;
  try {
    const addrs: `0x${string}`[] = await eth.request({ method: "eth_accounts" });
    if (addrs?.length) return addrs[0] as Address;
    const req: `0x${string}`[] = await eth.request({ method: "eth_requestAccounts" });
    return (req?.[0] ?? null) as Address | null;
  } catch {
    return null;
  }
}

function evToTxGiven(l: any): KarmaTransaction {
  const args = l.args as {
    from: Address;
    to: Address;
    amount: bigint;
    reason: string;
    timestamp: bigint;
  };
  return {
    id: `${l.transactionHash as Hash}:${Number(l.logIndex ?? 0)}`,
    type: "give",
    from: args.from,
    to: args.to,
    amount: Number(args.amount),
    reason: args.reason ?? "",
    timestamp: new Date(Number(args.timestamp) * 1000),
    txHash: l.transactionHash as Hash,
  };
}

function evToTxSlashed(l: any): KarmaTransaction {
  const args = l.args as {
    slasher: Address;
    victim: Address;
    amount: bigint;
    reason: string;
    timestamp: bigint;
  };
  return {
    id: `${l.transactionHash as Hash}:${Number(l.logIndex ?? 0)}`,
    type: "slash",
    from: args.slasher,
    to: args.victim,
    amount: Number(args.amount),
    reason: args.reason ?? "",
    timestamp: new Date(Number(args.timestamp) * 1000),
    txHash: l.transactionHash as Hash,
  };
}

type FilterKey = "all" | "give" | "slash" | "received";

/* ────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────── */
export const HistoryPage = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterKey>("all");

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<KarmaTransaction[]>([]);

  useEffect(() => {
    let alive = true;
    let unwatchGiven: (() => void) | null = null;
    let unwatchSlashed: (() => void) | null = null;

    (async () => {
      setLoading(true);
      try {
        // 1) resolve self address (fallback to mocks if no wallet)
        const addr = await getSelfAddress();
        if (!alive) return;

        const me: User =
          addr != null
            ? {
                ...(mockCurrentUser as unknown as User),
                id: addr.toLowerCase(),
                address: addr,
              }
            : ((mockCurrentUser as unknown as User) as User);

        setUser(me);

        // 2) fetch history from chain (if wallet & contract env present)
        if (addr && KARAM_ADDRESS) {
          const [logsGiven, logsSlashed] = await Promise.all([
            publicClient.getLogs({
              address: KARAM_ADDRESS,
              event: EV_KARMA_GIVEN,
              fromBlock: FROM_BLOCK,
              toBlock: "latest",
            }),
            publicClient.getLogs({
              address: KARAM_ADDRESS,
              event: EV_KARMA_SLASHED,
              fromBlock: FROM_BLOCK,
              toBlock: "latest",
            }),
          ]);

          const txs = [
            ...logsGiven.map(evToTxGiven),
            ...logsSlashed.map(evToTxSlashed),
          ].filter(
            (tx) =>
              tx.from.toLowerCase() === me.id ||
              tx.to.toLowerCase() === me.id
          );

          // newest first
          txs.sort((a, b) => tsToMs(b.timestamp) - tsToMs(a.timestamp));

          if (!alive) return;
          setTransactions(txs);

          // 3) watch live events
          unwatchGiven = publicClient.watchContractEvent({
            address: KARAM_ADDRESS,
            abi: EVENTS_ABI,
            eventName: "KarmaGiven",
            onLogs: (logs) => {
              if (!alive) return;
              const next = logs
                .map(evToTxGiven)
                .filter(
                  (tx) =>
                    tx.from.toLowerCase() === me.id ||
                    tx.to.toLowerCase() === me.id
                );
              if (next.length) {
                setTransactions((prev) => {
                  const merged = [...next, ...prev];
                  merged.sort(
                    (a, b) => tsToMs(b.timestamp) - tsToMs(a.timestamp)
                  );
                  const seen = new Set<string>();
                  return merged.filter((t) =>
                    seen.has(t.id) ? false : (seen.add(t.id), true)
                  );
                });
              }
            },
          });

          unwatchSlashed = publicClient.watchContractEvent({
            address: KARAM_ADDRESS,
            abi: EVENTS_ABI,
            eventName: "KarmaSlashed",
            onLogs: (logs) => {
              if (!alive) return;
              const next = logs
                .map(evToTxSlashed)
                .filter(
                  (tx) =>
                    tx.from.toLowerCase() === me.id ||
                    tx.to.toLowerCase() === me.id
                );
              if (next.length) {
                setTransactions((prev) => {
                  const merged = [...next, ...prev];
                  merged.sort(
                    (a, b) => tsToMs(b.timestamp) - tsToMs(a.timestamp)
                  );
                  const seen = new Set<string>();
                  return merged.filter((t) =>
                    seen.has(t.id) ? false : (seen.add(t.id), true)
                  );
                });
              }
            },
          });
        } else {
          // fallback to mocks
          setTransactions(
            mockTransactions as unknown as KarmaTransaction[]
          );
        }
      } catch (e: any) {
        if (!alive) return;
        toast({
          title: "Failed to load history",
          description: e?.message ?? "Please try again.",
          variant: "destructive",
        });
        // fallback
        setUser(mockCurrentUser as unknown as User);
        setTransactions(
          mockTransactions as unknown as KarmaTransaction[]
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      unwatchGiven?.();
      unwatchSlashed?.();
    };
  }, [toast]);

  const currentUserId = (user ?? (mockCurrentUser as unknown as User)).id.toLowerCase();

  // filter + counts
  const { filteredTransactions, counts } = useMemo(() => {
    const me = currentUserId;
    const res = { all: 0, give: 0, slash: 0, received: 0 };

    const list = (transactions ?? []).filter((tx) => {
      const isMine =
        tx.from?.toLowerCase?.() === me || tx.to?.toLowerCase?.() === me;
      if (!isMine) return false;

      res.all += 1;
      if (tx.from?.toLowerCase?.() === me && tx.type === "give") res.give += 1;
      if (tx.from?.toLowerCase?.() === me && tx.type === "slash") res.slash += 1;
      if (tx.to?.toLowerCase?.() === me) res.received += 1;

      switch (filter) {
        case "give":
          return tx.from?.toLowerCase?.() === me && tx.type === "give";
        case "slash":
          return tx.from?.toLowerCase?.() === me && tx.type === "slash";
        case "received":
          return tx.to?.toLowerCase?.() === me;
        default:
          return true;
      }
    });

    // newest first
    list.sort((a, b) => tsToMs(b.timestamp) - tsToMs(a.timestamp));

    return { filteredTransactions: list, counts: res };
  }, [transactions, filter, currentUserId]);

  const filters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all", label: "All", count: counts.all },
    { key: "give", label: "Given", count: counts.give },
    { key: "slash", label: "Slashed", count: counts.slash },
    { key: "received", label: "Received", count: counts.received },
  ];

  const exportTransactions = () => {
    try {
      const rows = filteredTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        reason: (tx as any).reason ?? "",
        timestamp: tsToIso(tx.timestamp),
        txHash: (tx as any).txHash ?? "",
      }));

      const headers = Object.keys(
        rows[0] ?? {
          id: "",
          type: "",
          from: "",
          to: "",
          amount: "",
          reason: "",
          timestamp: "",
          txHash: "",
        }
      );
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          headers
            .map((h) => {
              const val = (r as any)[h];
              if (val == null) return "";
              const s = String(val).replace(/"/g, '""');
              return /[",\n]/.test(s) ? `"${s}"` : s;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `karam-history-${filter}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "CSV downloaded." });
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transaction History
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportTransactions}
              disabled={loading || filteredTransactions.length === 0}
            >
              <Download className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2 overflow-x-auto">
            {filters.map((filterOption) => (
              <Button
                key={filterOption.key}
                variant={filter === filterOption.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(filterOption.key)}
                className="whitespace-nowrap"
                disabled={loading}
              >
                {filterOption.label}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {loading ? "—" : filterOption.count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-3">
        {loading && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={`skeleton-${i}`}>
                <CardContent className="p-4">
                  <div className="animate-pulse h-6 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {!loading && filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Filter className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try changing the filter or start giving karma!
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      {/* Summary Stats */}
      {!loading && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-karma-positive">
                  +
                  {transactions
                    .filter((tx) => tx.to?.toLowerCase?.() === currentUserId)
                    .reduce((s, tx) => s + (tx.amount ?? 0), 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Received
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-primary">
                  -
                  {transactions
                    .filter(
                      (tx) =>
                        tx.from?.toLowerCase?.() === currentUserId &&
                        tx.type === "give"
                    )
                    .reduce((s, tx) => s + (tx.amount ?? 0), 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Given
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};