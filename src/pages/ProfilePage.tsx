import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { KarmaDisplay } from '@/components/KarmaDisplay';
import { mockCurrentUser } from '@/lib/mockData';
import { ExternalLink, Copy, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types/karma';

/**
 * ProfilePage:
 *  - Loads the signed-in user's Karam profile (from indexer/contracts if available; falls back to mocks)
 *  - Copy to clipboard for address
 *  - Open address/ENS in explorer
 *  - Connect socials (twitter/github/discord) via contract (platform ids 0/1/2)
 *  - Optional World ID verify CTA (no-op until worldid helper is added)
 */

const PLATFORM_IDS: Record<'twitter' | 'github' | 'discord', number> = {
  twitter: 0,
  github: 1,
  discord: 2,
};

export const ProfilePage = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const mockUser = useMemo(() => mockCurrentUser as unknown as User, []);

  // env-based explorers (safe fallbacks)
  const explorerBase = import.meta.env.VITE_EXPLORER_BASE as string | undefined; // e.g. https://explorer.world.org
  const ensAppBase = (import.meta.env.VITE_ENS_APP_BASE as string | undefined) ?? 'https://app.ens.domains/name';

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      /* try {
        // Try real libs first (dynamic import keeps this file working pre-integration)
        const indexer: any = await import('@/lib/indexer').catch(() => null);

        // 1) Load current user's profile
        let profile: User | null = null;
        if (indexer?.fetchSelfProfile) {
          profile = await indexer.fetchSelfProfile();
        }
        if (!profile) profile = mockUser;

        if (!alive) return;
        setUser(profile);
      } catch (e: any) {
        if (!alive) return;
        toast({
          title: 'Failed to load profile',
          description: e?.message ?? 'Please try again.',
          variant: 'destructive',
        });
        setUser(mockUser);
      } finally {
        if (alive) setLoading(false);
      } */
    })();
    return () => { alive = false; };
  }, [mockUser, toast]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText((user ?? mockUser).address);
      toast({ title: 'Address copied', description: 'Wallet address copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
  };

  const openAddressInExplorer = () => {
    const addr = (user ?? mockUser).address;
    if (!explorerBase) {
      toast({ title: 'No explorer configured', description: 'Set VITE_EXPLORER_BASE to enable this.', variant: 'destructive' });
      return;
    }
    window.open(`${explorerBase}/address/${addr}`, '_blank', 'noopener,noreferrer');
  };

  const openEnsInApp = () => {
    const name = (user ?? mockUser).ensName;
    if (!name) return;
    window.open(`${ensAppBase}/${name}`, '_blank', 'noopener,noreferrer');
  };

  const connectSocial = async (platform: 'twitter' | 'github' | 'discord') => {
    const username = window.prompt(`Enter your ${platform} username (without @)`);
    if (!username) return;

   /*  try {
      // real contract call if available
      const contracts: any = await import('@/lib/contracts').catch(() => null);
      if (contracts?.connectSocial) {
        await contracts.connectSocial(PLATFORM_IDS[platform], username);
      } else {
        // mock path: just update local UI
        const u = user ?? mockUser;
        (u.socialProfiles as any)[platform] = username;
        setUser({ ...u });
      }

      toast({ title: 'Connected', description: `${platform} @${username} linked to your profile.` });

      // optimistic local update (for real contracts too)
      setUser(prev => {
        const u = (prev ?? mockUser);
        return {
          ...u,
          socialProfiles: { ...u.socialProfiles, [platform]: username },
        };
      });
    } catch (e: any) {
      toast({
        title: 'Failed to connect',
        description: e?.shortMessage || e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } */
  };

  const verifyWorldId = async () => {
    /* try {
      const worldid: any = await import('@/lib/worldid').catch(() => null);
      if (!worldid?.openWidgetAndVerify) {
        toast({
          title: 'World ID not configured',
          description: 'Add @/lib/worldid to enable verification.',
          variant: 'destructive',
        });
        return;
      }
      const ok = await worldid.openWidgetAndVerify();
      if (ok) {
        setUser(prev => prev ? { ...prev, isVerified: true } : prev);
        toast({ title: 'Verified ✓', description: 'World ID verification complete.' });
      } else {
        toast({ title: 'Verification canceled', description: 'No changes made.' });
      }
    } catch (e: any) {
      toast({
        title: 'Verification failed',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } */
  };

  const u = (user ?? mockUser);

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6 text-center">
          <UserAvatar user={u} size="lg" className="mx-auto mb-4" />
          <h2 className="font-semibold text-lg mb-2">
            {u.ensName || `${u.address.slice(0, 6)}...${u.address.slice(-4)}`}
          </h2>

          <KarmaDisplay karma={u.karma} size="lg" showLabel={false} className="justify-center mb-3" />

          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant={u.isVerified ? 'default' : 'secondary'} className="text-xs">
              {u.isVerified ? 'Verified ✓' : 'Not Verified'}
            </Badge>
            {!u.isVerified && (
              <Button size="sm" variant="outline" onClick={verifyWorldId}>
                <ShieldCheck className="h-4 w-4 mr-1" /> Verify with World ID
              </Button>
            )}
          </div>

          {u.bio && <p className="text-sm text-muted-foreground">{u.bio}</p>}
        </CardContent>
      </Card>

      {/* Social Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(['twitter', 'github', 'discord'] as const).map((platform) => {
            const username = u.socialProfiles?.[platform] as string | undefined;
            return (
              <div key={platform} className="flex items-center justify-between">
                <span className="text-sm capitalize">{platform}</span>
                {username ? (
                  <Badge variant="secondary" className="text-xs">
                    @{username}
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => connectSocial(platform)}>
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
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
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={copyAddress} title="Copy address">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={openAddressInExplorer} title="Open in explorer">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Input value={u.address} readOnly className="text-xs" />

          {u.ensName && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm">ENS</span>
                <Button variant="ghost" size="sm" onClick={openEnsInApp} title="Open in ENS">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <Input value={u.ensName} readOnly />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
