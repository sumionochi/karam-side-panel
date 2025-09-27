import { useState } from 'react';
import { TwitterDetector } from '@/components/TwitterDetector';
import { KarmaDisplay } from '@/components/KarmaDisplay';
import { WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS } from '@/constants/contract';

const Index = () => {
  const [detectedUsername, setDetectedUsername] = useState<string | null>(null);

  return (
    <div className="karma-panel min-h-screen p-4 space-y-4">
      {/* Header */}
      <div className="text-center py-4 border-b-2 border-border">
        <h1 className="text-2xl font-black uppercase tracking-wider">
          KARMA TRACKER
        </h1>
        <p className="text-xs text-muted-foreground font-bold mt-1">
          BLOCKCHAIN KARMA SYSTEM
        </p>
      </div>

      {/* Twitter Detection */}
      <TwitterDetector onUsernameDetected={setDetectedUsername} />

      {/* Karma Display */}
      <KarmaDisplay twitterUsername={detectedUsername} />

      {/* Footer */}
      <div className="text-center pt-4 border-t-2 border-border">
        <div className="text-xs text-muted-foreground">
          WORLD SEPOLIA • CONTRACT: {WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS?.slice(0, 8)}...
        </div>
      </div>
    </div>
  );
};

export default Index;