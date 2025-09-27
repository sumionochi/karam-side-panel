import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransactionItem } from '@/components/TransactionItem';
import { mockTransactions, mockCurrentUser } from '@/lib/mockData';
import { Filter, Download, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { KarmaTransaction, User } from '@/types/karma';
import { tsToMs, tsToIso } from '@/lib/time';

/**
 * HistoryPage:
 *  - Loads the signed-in user's history (tries `@/lib/indexer.fetchHistory(address)`; falls back to mocks)
 *  - Filter tabs: All / Given / Slashed / Received
 *  - Export CSV for the current filtered list
 */

type FilterKey = 'all' | 'give' | 'slash' | 'received';

export const HistoryPage = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterKey>('all');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<KarmaTransaction[]>([]);

  // initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      /* try {
        // dynamic imports so we compile before real libs land
        const indexer: any = await import('@/lib/indexer').catch(() => null);

        // 1) who am i?
        let me: User | null = null;
        if (indexer?.fetchSelfProfile) {
          me = await indexer.fetchSelfProfile();
        }
        if (!me) me = mockCurrentUser as unknown as User;
        if (!alive) return;
        setUser(me);

        // 2) fetch history
        if (indexer?.fetchHistory && me?.address) {
          const hx = await indexer.fetchHistory(me.address, { limit: 200 }); // adjust as needed
          if (!alive) return;
          setTransactions(hx ?? []);
        } else {
          if (!alive) return;
          setTransactions(mockTransactions as unknown as KarmaTransaction[]);
        }
      } catch (e: any) {
        if (!alive) return;
        toast({
          title: 'Failed to load history',
          description: e?.message ?? 'Please try again.',
          variant: 'destructive',
        });
        // fallback
        setUser(mockCurrentUser as unknown as User);
        setTransactions(mockTransactions as unknown as KarmaTransaction[]);
      } finally {
        if (alive) setLoading(false);
      } */
    })();
    return () => { alive = false; };
  }, [toast]);

  const currentUserId = (user ?? (mockCurrentUser as unknown as User)).id;

  // filter + counts
  const { filteredTransactions, counts } = useMemo(() => {
    const me = currentUserId;
    const res = {
      all: 0, give: 0, slash: 0, received: 0
    };
    const list = (transactions ?? []).filter((tx) => {
      const isMine = tx.from === me || tx.to === me;
      if (!isMine) return false;

      // count buckets
      res.all += 1;
      if (tx.from === me && tx.type === 'give') res.give += 1;
      if (tx.from === me && tx.type === 'slash') res.slash += 1;
      if (tx.to === me) res.received += 1;

      switch (filter) {
        case 'give':     return tx.from === me && tx.type === 'give';
        case 'slash':    return tx.from === me && tx.type === 'slash';
        case 'received': return tx.to === me;
        default:         return true;
      }
    });

    // newest first (if timestamp exists)
    list.sort((a, b) => tsToMs(b.timestamp) - tsToMs(a.timestamp));

    return { filteredTransactions: list, counts: res };
  }, [transactions, filter, currentUserId]);

  const filters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all',      label: 'All',      count: counts.all      },
    { key: 'give',     label: 'Given',    count: counts.give     },
    { key: 'slash',    label: 'Slashed',  count: counts.slash    },
    { key: 'received', label: 'Received', count: counts.received },
  ];

  const exportTransactions = () => {
    try {
      const rows = filteredTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        reason: (tx as any).reason ?? '',
        timestamp: tsToIso(tx.timestamp),
        txHash: (tx as any).txHash ?? '',
      }));

      // CSV
      const headers = Object.keys(rows[0] ?? {
        id: '', type: '', from: '', to: '', amount: '', reason: '', timestamp: '', txHash: '',
      });
      const csv = [
        headers.join(','),
        ...rows.map((r) =>
          headers.map((h) => {
            const val = (r as any)[h];
            // escape quotes/commas
            if (val == null) return '';
            const s = String(val).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `karam-history-${filter}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Exported', description: 'CSV downloaded.' });
    } catch (e: any) {
      toast({
        title: 'Export failed',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
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
            <Button variant="outline" size="sm" onClick={exportTransactions} disabled={loading || filteredTransactions.length === 0}>
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
                variant={filter === filterOption.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterOption.key)}
                className="whitespace-nowrap"
                disabled={loading}
              >
                {filterOption.label}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {loading ? '—' : filterOption.count}
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
                  +{
                    transactions
                      .filter(tx => tx.to === currentUserId)
                      .reduce((s, tx) => s + (tx.amount ?? 0), 0)
                  }
                </div>
                <div className="text-xs text-muted-foreground">Total Received</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-primary">
                  -{
                    transactions
                      .filter(tx => tx.from === currentUserId && tx.type === 'give')
                      .reduce((s, tx) => s + (tx.amount ?? 0), 0)
                  }
                </div>
                <div className="text-xs text-muted-foreground">Total Given</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
