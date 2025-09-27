// src/pages/LeaderboardPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { KarmaDisplay } from '@/components/KarmaDisplay';
import { mockLeaderboard, mockCurrentUser } from '@/lib/mockData';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry, User } from '@/types/karma';
import { useToast } from '@/hooks/use-toast';
import { useXHandle } from '@/hooks/use-xhandle';

export const LeaderboardPage = () => {
  const { toast } = useToast();
  const { handle: xHandle } = useXHandle();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selfAddr, setSelfAddr] = useState<string | null>(null);

  // map of address → element for smooth scroll/highlight
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        // Dynamic import so this compiles even before the real indexer exists
        const indexer: any = await import('@/lib/indexer').catch(() => null);

        // 1) Self (for "You" badge / highlight)
        if (indexer?.fetchSelfProfile) {
          try {
            const self: User | null = await indexer.fetchSelfProfile();
            if (alive && self?.address) setSelfAddr(self.address);
          } catch {
            // ignore and use fallback below
          }
        }
        if (alive && !selfAddr) {
          setSelfAddr((mockCurrentUser as unknown as User).address);
        }

        // 2) Leaderboard
        if (indexer?.fetchLeaderboard) {
          const top: LeaderboardEntry[] = await indexer.fetchLeaderboard(50);
          if (!alive) return;
          setEntries((top ?? []).slice(0, 50));
        } else {
          if (!alive) return;
          setEntries(mockLeaderboard as unknown as LeaderboardEntry[]);
        }
      } catch (e: any) {
        if (!alive) return;
        toast({
          title: 'Failed to load leaderboard',
          description: e?.message ?? 'Please try again.',
          variant: 'destructive',
        });
        setEntries(mockLeaderboard as unknown as LeaderboardEntry[]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // highlight priorities: detected X handle > signed-in self
  const highlightAddress = useMemo(() => {
    if (!entries?.length) return null;
    if (xHandle) {
      const found = entries.find(
        (e) => (e.user.socialProfiles?.twitter || '').toLowerCase() === xHandle.toLowerCase(),
      );
      if (found) return found.user.address;
    }
    return selfAddr;
  }, [entries, selfAddr, xHandle]);

  useEffect(() => {
    if (!highlightAddress) return;
    const el = refs.current[highlightAddress];
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [highlightAddress, entries]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <span className="text-gray-400 font-bold">🥈</span>;
      case 3:
        return <span className="text-amber-600 font-bold">🥉</span>;
      default:
        return <span className="text-muted-foreground font-semibold">#{rank}</span>;
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-karma-positive" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-karma-negative" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getRankCardStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'ring-2 ring-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900';
      case 2:
        return 'ring-2 ring-gray-400 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900';
      case 3:
        return 'ring-2 ring-amber-600 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900';
      default:
        return '';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-primary" />
            Karma Leaderboard
          </CardTitle>
        </CardHeader>
      </Card>

      {/* List */}
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

        {!loading &&
          entries.map((entry) => {
            const addr = entry.user.address;
            const isMe = selfAddr && addr.toLowerCase() === selfAddr.toLowerCase();
            const isHighlighted =
              highlightAddress && addr.toLowerCase() === highlightAddress.toLowerCase();

            return (
              <Card
                key={addr}
                className={cn(
                  'transition-all duration-200 hover:shadow-md',
                  getRankCardStyle(entry.rank),
                  isHighlighted && 'ring-2 ring-primary',
                )}
              >
                <CardContent className="p-4">
                  {/* attach the ref to a real DOM node */}
                  <div ref={(el) => void (refs.current[addr] = el)}>
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-8 h-8">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* User Info */}
                      <UserAvatar user={entry.user} size="md" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">
                            {entry.user.ensName ||
                              `${entry.user.address.slice(0, 6)}...${entry.user.address.slice(-4)}`}
                          </h3>
                          {entry.user.isVerified && (
                            <Badge variant="secondary" className="text-xs">
                              ✓
                            </Badge>
                          )}
                          {isMe && (
                            <Badge variant="default" className="text-[10px]">
                              You
                            </Badge>
                          )}
                          {xHandle &&
                            (entry.user.socialProfiles?.twitter || '').toLowerCase() ===
                              xHandle.toLowerCase() &&
                            !isMe && (
                              <Badge variant="outline" className="text-[10px]">
                                @{xHandle}
                              </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                          <KarmaDisplay karma={entry.user.karma} size="sm" showLabel={false} />

                          {/* Rank change */}
                          <div className="flex items-center gap-1">
                            {getChangeIcon(entry.change)}
                            {entry.change !== 0 && (
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  entry.change > 0
                                    ? 'text-karma-positive'
                                    : 'text-karma-negative',
                                )}
                              >
                                {Math.abs(entry.change)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          Given: {entry.user.totalGiven ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Received: {entry.user.totalReceived ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

        {!loading && entries.length === 0 && (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              No entries yet.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer info */}
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Rankings update every hour</p>
          <p className="text-xs text-muted-foreground">
            Next redistribution will shuffle rankings randomly
          </p>
        </CardContent>
      </Card>
    </div>
  );
};