import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { KarmaDisplay } from '@/components/KarmaDisplay';
import { mockLeaderboard } from '@/lib/mockData';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LeaderboardPage = () => {
  // TODO: Replace with actual leaderboard data from smart contract
  const leaderboard = mockLeaderboard;

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

      <div className="space-y-3">
        {leaderboard.map((entry) => (
          <Card 
            key={entry.user.id} 
            className={cn(
              'transition-all duration-200 hover:shadow-md',
              getRankCardStyle(entry.rank)
            )}
          >
            <CardContent className="p-4">
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
                      {entry.user.ensName || `${entry.user.address.slice(0, 6)}...${entry.user.address.slice(-4)}`}
                    </h3>
                    {entry.user.isVerified && (
                      <Badge variant="secondary" className="text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <KarmaDisplay karma={entry.user.karma} size="sm" showLabel={false} />
                    
                    {/* Rank change */}
                    <div className="flex items-center gap-1">
                      {getChangeIcon(entry.change)}
                      {entry.change !== 0 && (
                        <span className={cn(
                          'text-xs font-medium',
                          entry.change > 0 ? 'text-karma-positive' : 'text-karma-negative'
                        )}>
                          {Math.abs(entry.change)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    Given: {entry.user.totalGiven}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Received: {entry.user.totalReceived}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer info */}
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Rankings update every hour
          </p>
          <p className="text-xs text-muted-foreground">
            Next redistribution will shuffle rankings randomly
          </p>
        </CardContent>
      </Card>
    </div>
  );
};