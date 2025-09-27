import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KarmaService, type UserKarmaData, type KarmaEvent } from '@/services/KarmaService';

interface KarmaDisplayProps {
  twitterUsername: string | null;
}

export const KarmaDisplay = ({ twitterUsername }: KarmaDisplayProps) => {
  const [karmaData, setKarmaData] = useState<UserKarmaData | null>(null);
  const [recentEvents, setRecentEvents] = useState<KarmaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!twitterUsername) {
      setKarmaData(null);
      setRecentEvents([]);
      return;
    }

    const fetchKarmaData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const karmaService = new KarmaService();
        
        // Find address by Twitter username
        const address = await karmaService.getAddressByTwitterUsername(twitterUsername);
        
        if (!address) {
          setError('User not found in karma system');
          setKarmaData(null);
          setRecentEvents([]);
          return;
        }

        // Get user karma data
        const userData = await karmaService.getUserKarmaData(address);
        setKarmaData(userData);

        // Get recent events for this user
        const events = await karmaService.getRecentKarmaEvents(address);
        setRecentEvents(events.slice(0, 10)); // Show only last 10 events
        
      } catch (err) {
        console.error('Error fetching karma data:', err);
        setError('Failed to fetch karma data');
        setKarmaData(null);
        setRecentEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKarmaData();
  }, [twitterUsername]);

  if (!twitterUsername) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black text-muted-foreground">
            NO USERNAME DETECTED
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black">
            LOADING...
          </div>
        </div>
      </Card>
    );
  }

  if (error || !karmaData) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black text-destructive">
            {error || 'NOT FOUND'}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            @{twitterUsername} not registered in karma system
          </div>
        </div>
      </Card>
    );
  }

  const karmaValue = parseFloat(karmaData.karma);
  const karmaColor = karmaValue > 500 ? 'text-karma-positive' : 
                    karmaValue < 100 ? 'text-karma-negative' : 
                    'text-karma-neutral';

  return (
    <div className="space-y-4">
      {/* Main Karma Card */}
      <Card className="border-2 border-border bg-card shadow-strong">
        <div className="p-4">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
            KARMA PROFILE
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">USERNAME</span>
              <span className="font-black">@{twitterUsername}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">KARMA</span>
              <span className={`text-2xl font-black ${karmaColor}`}>
                {Math.floor(karmaValue)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">STATUS</span>
              {karmaData.isRegistered ? (
                <Badge variant="outline" className="border-karma-positive text-karma-positive font-black">
                  REGISTERED
                </Badge>
              ) : (
                <Badge variant="outline" className="border-karma-negative text-karma-negative font-black">
                  NOT REGISTERED
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              ADDRESS: {karmaData.address.slice(0, 6)}...{karmaData.address.slice(-4)}
            </div>
          </div>
        </div>
      </Card>

      {/* Social Connections */}
      {(karmaData.socialConnections.githubUsername || karmaData.socialConnections.discordUsername) && (
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-4">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
              SOCIAL CONNECTIONS
            </div>
            
            <div className="space-y-2">
              {karmaData.socialConnections.githubUsername && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">GITHUB</span>
                  <span className="text-xs font-black">
                    {karmaData.socialConnections.githubUsername}
                  </span>
                </div>
              )}
              
              {karmaData.socialConnections.discordUsername && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">DISCORD</span>
                  <span className="text-xs font-black">
                    {karmaData.socialConnections.discordUsername}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      {recentEvents.length > 0 && (
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-4">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
              RECENT ACTIVITY
            </div>
            
            <div className="space-y-3">
              {recentEvents.slice(0, 5).map((event, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-black ${
                        event.type === 'given' 
                          ? 'border-karma-positive text-karma-positive' 
                          : 'border-karma-negative text-karma-negative'
                      }`}
                    >
                      {event.type === 'given' ? '+' : '-'}{Math.floor(parseFloat(event.amount))}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {event.reason && (
                    <div className="text-xs text-muted-foreground">
                      "{event.reason}"
                    </div>
                  )}
                  
                  {index < recentEvents.slice(0, 5).length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};