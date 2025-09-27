import { UserAvatar } from './UserAvatar';
import { KarmaDisplay } from './KarmaDisplay';
import { Button } from '@/components/ui/button';
import { Settings, Bell, RefreshCw } from 'lucide-react';
import { mockCurrentUser } from '@/lib/mockData';

export const Header = () => {
  // TODO: Replace with actual user state from smart contract
  const currentUser = mockCurrentUser;

  const handleRedistribution = () => {
    // TODO: Integrate Pyth Network VRF for random redistribution
    console.log('🎲 Triggering redistribution...');
  };

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar user={currentUser} size="md" />
          <div>
            <h2 className="font-semibold text-sm">
              {currentUser.ensName || `${currentUser.address.slice(0, 6)}...${currentUser.address.slice(-4)}`}
            </h2>
            <KarmaDisplay karma={currentUser.karma} size="sm" showLabel={false} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRedistribution}
            title="Trigger redistribution (Pyth VRF)"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Daily limits display */}
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>Give: {currentUser.dailyGiveUsed}/{currentUser.dailyGiveLimit}</span>
        <span>Slash: {currentUser.dailySlashUsed}/{currentUser.dailySlashLimit}</span>
      </div>
    </header>
  );
};