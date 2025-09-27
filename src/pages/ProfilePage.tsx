import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { KarmaDisplay } from '@/components/KarmaDisplay';
import { mockCurrentUser } from '@/lib/mockData';
import { Settings, ExternalLink, Copy } from 'lucide-react';

export const ProfilePage = () => {
  // TODO: Replace with actual user profile management
  const user = mockCurrentUser;

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6 text-center">
          <UserAvatar user={user} size="lg" className="mx-auto mb-4" />
          <h2 className="font-semibold text-lg mb-2">
            {user.ensName || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`}
          </h2>
          <KarmaDisplay karma={user.karma} size="lg" showLabel={false} className="justify-center mb-4" />
          {user.bio && <p className="text-sm text-muted-foreground">{user.bio}</p>}
        </CardContent>
      </Card>

      {/* Social Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(user.socialProfiles).map(([platform, username]) => (
            <div key={platform} className="flex items-center justify-between">
              <span className="text-sm capitalize">{platform}</span>
              {username ? (
                <Badge variant="secondary" className="text-xs">
                  @{username}
                </Badge>
              ) : (
                <Button variant="outline" size="sm">Connect</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Address & ENS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Address</span>
            <Button variant="ghost" size="sm">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <Input value={user.address} readOnly className="text-xs" />
          {user.ensName && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm">ENS</span>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <Input value={user.ensName} readOnly />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};