import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KarmaDisplay } from '@/components/KarmaDisplay';
import { TransactionItem } from '@/components/TransactionItem';
import { Badge } from '@/components/ui/badge';
import { mockCurrentUser, mockTransactions } from '@/lib/mockData';
import { TrendingUp, Clock, Gift, Users } from 'lucide-react';
import { useXHandle } from '@/hooks/use-xhandle';

export const HomePage = () => {
  // Detected Twitter/X handle from active tab (background → sidepanel)
  const { handle } = useXHandle();

  // TODO: Replace with actual user state and recent transactions from smart contract
  const currentUser = mockCurrentUser;
  const recentTransactions = mockTransactions.slice(0, 5);

  const stats = [
    {
      title: 'Total Given',
      value: currentUser.totalGiven,
      icon: Gift,
      color: 'text-karma-positive',
    },
    {
      title: 'Total Received',
      value: currentUser.totalReceived,
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      title: 'Active Days',
      value: '42',
      icon: Clock,
      color: 'text-muted-foreground',
    },
  ];

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
              {currentUser.karma.toLocaleString()}
            </div>
            <div className="flex justify-center gap-4 text-sm opacity-90">
              <span>Today: {currentUser.dailyGiveUsed}/{currentUser.dailyGiveLimit} given</span>
              <span>•</span>
              <span>{currentUser.dailySlashUsed}/{currentUser.dailySlashLimit} slashed</span>
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
                <div className="text-lg font-semibold">{stat.value}</div>
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
            <Badge variant={currentUser.isVerified ? 'default' : 'secondary'}>
              {currentUser.isVerified ? 'Verified ✓' : 'Not Verified'}
            </Badge>
          </div>
          {!currentUser.isVerified && (
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
          {recentTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              currentUserId={currentUser.id}
            />
          ))}
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
            Random redistribution in 15-40 days (VRF-determined)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
