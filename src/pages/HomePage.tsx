import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KarmaDisplay } from '@/components/KarmaDisplay';
import { TransactionItem } from '@/components/TransactionItem';
import { Badge } from '@/components/ui/badge';
import { mockCurrentUser, mockTransactions } from '@/lib/mockData';
import { TrendingUp, Clock, Gift, Users } from 'lucide-react';
import { useXHandle } from '@/hooks/use-xhandle';
import { useToast } from '@/hooks/use-toast';
import type { User, KarmaTransaction } from '@/types/karma';

/**
 * This HomePage:
 * - Listens to the detected X/Twitter handle via `useXHandle`
 * - Tries to fetch the corresponding Karam profile + recent txns (real libs if available)
 * - Falls back to mock data if real libs are not wired yet
 * - Shows a small “Detected X handle” hint so you can verify Step 1 wiring
 *
 * Expected real libs (add later; this file will still run with mocks until then):
 *   - `@/lib/indexer`: fetchProfileByXHandle(handle), fetchSelfProfile(), fetchRecentTransactions(address, limit)
 *   - `@/lib/contracts`: (optional) direct reads: getDailyUsage(address) etc.
 */

export const HomePage = () => {
  const { handle } = useXHandle();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<KarmaTransaction[]>([]);
  const [dailyGiveUsed, setDailyGiveUsed] = useState<number>(0);
  const [dailyGiveLimit, setDailyGiveLimit] = useState<number>(30);
  const [dailySlashUsed, setDailySlashUsed] = useState<number>(0);
  const [dailySlashLimit, setDailySlashLimit] = useState<number>(20);

  // Fallback (mock) user to keep UI functional before real libs land
  const mockUser = useMemo(() => mockCurrentUser, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      // Try dynamic imports to avoid hard compile dependency before libs exist
      let indexer: any = null;
      let contracts: any = null;
      /* try { indexer = await import('@/lib/indexer'); } catch */
      /* try { contracts = await import('@/lib/contracts'); } catch */

      try {
        // 1) Load profile (by X handle if detected, else "self")
        let profile: User | null = null;

        if (indexer && handle) {
          profile = await indexer.fetchProfileByXHandle(handle);
        } 
        if (!profile && indexer && !handle) {
          // fallback: current user (e.g., connected wallet)
          profile = await indexer.fetchSelfProfile();
        }
        if (!profile) {
          // ultimate fallback: mocks
          profile = mockUser as unknown as User;
        }

        if (!alive) return;
        setUser(profile);

        // 2) Load recent transactions
        if (indexer && profile?.address) {
          const txs = await indexer.fetchRecentTransactions(profile.address, 5);
          if (!alive) return;
          setRecentTransactions(txs);
        } else {
          if (!alive) return;
          setRecentTransactions(mockTransactions.slice(0, 5) as unknown as KarmaTransaction[]);
        }

        // 3) Daily usage (if contracts helper is available)
        if (contracts && profile?.address) {
          try {
            const usage = await contracts.getDailyUsage(profile.address);
            if (alive && usage) {
              setDailyGiveUsed(Number(usage.totalGivenToday ?? 0));
              setDailySlashUsed(Number(usage.totalSlashedToday ?? 0));
            }
          } catch { /* ignore, keep mock caps */ }
        } else {
          // mock numbers that match your UI limits
          setDailyGiveUsed(mockUser.dailyGiveUsed);
          setDailySlashUsed(mockUser.dailySlashUsed);
        }

        // 4) Limits (constants in your contract; mirror here for UI)
        setDailyGiveLimit(30);
        setDailySlashLimit(20);
      } catch (e: any) {
        if (!alive) return;
        toast({
          title: 'Failed to load profile',
          description: e?.message ?? 'Please try again.',
          variant: 'destructive',
        });
        // fallback to mocks
        setUser(mockUser as unknown as User);
        setRecentTransactions(mockTransactions.slice(0, 5) as unknown as KarmaTransaction[]);
        setDailyGiveUsed(mockUser.dailyGiveUsed);
        setDailySlashUsed(mockUser.dailySlashUsed);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [handle, mockUser, toast]);

  const stats = useMemo(() => ([
    { title: 'Total Given',    value: user?.totalGiven ?? mockUser.totalGiven,       icon: Gift,       color: 'text-karma-positive' },
    { title: 'Total Received', value: user?.totalReceived ?? mockUser.totalReceived, icon: TrendingUp, color: 'text-primary' },
    { title: 'Active Days',    value: (user as any)?.activeDays ?? '—',              icon: Clock,      color: 'text-muted-foreground' },
  ]), [user, mockUser]);

  return (
    <div className="p-4 space-y-4">
      {/* X Handle hint (for testing Step 1 wiring) */}
      <div className="text-xs text-muted-foreground">
        {handle ? (
          <>Detected X handle: <span className="font-medium">@{handle}</span></>
        ) : (
          <>Open a Twitter/X profile tab to auto-detect a handle.</>
        )}
      </div>

      {/* Karma Overview */}
      <Card className="karma-gradient text-white">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Your Karma</h2>
            <div className="text-3xl font-bold mb-4">
              {loading
                ? '—'
                : (user?.karma ?? mockUser.karma).toLocaleString()}
            </div>
            <div className="flex justify-center gap-4 text-sm opacity-90">
              <span>
                Today: {loading ? '—' : dailyGiveUsed}/{dailyGiveLimit} given
              </span>
              <span>•</span>
              <span>
                {loading ? '—' : dailySlashUsed}/{dailySlashLimit} slashed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-3 text-center">
                <Icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                <div className="text-lg font-semibold">
                  {loading ? '—' : stat.value}
                </div>
                <div className="text-xs text-muted-foreground">{stat.title}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* World ID Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">World ID</span>
            <Badge variant={user?.isVerified ? 'default' : 'secondary'}>
              {user?.isVerified ? 'Verified ✓' : 'Not Verified'}
            </Badge>
          </div>
          {!user?.isVerified && (
            <p className="text-xs text-muted-foreground mt-2">
              Complete World ID verification to unlock full features
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(loading ? [] : recentTransactions).map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              currentUserId={(user ?? mockUser).id}
            />
          ))}
          {!loading && recentTransactions.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No recent transactions
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Redistribution */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Next Redistribution</span>
            <Badge variant="outline" className="text-xs">
              🎲 Pyth VRF
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {/* Later: replace with real scheduler state */}
            Random redistribution in 15-40 days (VRF-determined)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
