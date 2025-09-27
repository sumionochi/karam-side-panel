import { useEffect, useMemo, useState, useCallback } from 'react';
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

type Platform = 'twitter' | 'github' | 'discord';
const PLATFORM_IDS: Record<Platform, number> = { twitter: 0, github: 1, discord: 2 };

export const ProfilePage = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [connectBusy, setConnectBusy] = useState<Platform | null>(null);

  // fallbacks to keep the screen useful even before on-chain/indexer wiring
  const mockUser = useMemo(() => mockCurrentUser as unknown as User, []);

  // Optional envs
  const explorerBase = (import.meta.env.VITE_EXPLORER_BASE as string | undefined) || '';
  const ensAppBase =
    (import.meta.env.VITE_ENS_APP_BASE as string | undefined) ?? 'https://app.ens.domains/name';

  // World ID client env (client-side)
  const WORLD_APP_ID = import.meta.env.VITE_WORLD_APP_ID as `app_${string}` | undefined;
  const WORLD_ACTION_ID = import.meta.env.VITE_WORLD_ACTION_ID as string | undefined;
  const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;
  const VERIFY_ENDPOINT = API_BASE ? `${API_BASE}/worldid/verify` : undefined;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Start from mock (always have something to render)
        let base: User = { ...(mockUser as User) };

        // Try to enhance from on-chain when contracts helper is present
        const contracts = (await import('@/lib/contracts').catch(() => null)) as
          | {
              getKarma?: (addr: string) => Promise<number>;
              getSocialConnections?: (
                addr: string
              ) => Promise<{ twitterUsername: string; githubUsername: string; discordUsername: string }>;
            }
          | null;

        if (contracts?.getKarma) {
          try {
            const k = await contracts.getKarma(base.address);
            base = { ...base, karma: Number(k) };
          } catch {
            // ignore; keep mock
          }
        }

        if (contracts?.getSocialConnections) {
          try {
            const sc = await contracts.getSocialConnections(base.address);
            base = {
              ...base,
              socialProfiles: {
                ...base.socialProfiles,
                twitter: sc.twitterUsername || base.socialProfiles.twitter,
                github: sc.githubUsername || base.socialProfiles.github,
                discord: sc.discordUsername || base.socialProfiles.discord,
              },
            };
          } catch {
            // ignore; keep mock
          }
        }

        if (!alive) return;
        setUser(base);
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
      }
    })();
    return () => {
      alive = false;
    };
  }, [mockUser, toast]);

  const u: User = (user ?? mockUser);

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(u.address);
      toast({ title: 'Address copied', description: 'Wallet address copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
  }, [toast, u.address]);

  const openAddressInExplorer = useCallback(() => {
    if (!explorerBase) {
      toast({
        title: 'No explorer configured',
        description: 'Set VITE_EXPLORER_BASE to enable this.',
        variant: 'destructive',
      });
      return;
    }
    window.open(`${explorerBase}/address/${u.address}`, '_blank', 'noopener,noreferrer');
  }, [explorerBase, toast, u.address]);

  const openEnsInApp = useCallback(() => {
    if (!u.ensName) return;
    window.open(`${ensAppBase}/${u.ensName}`, '_blank', 'noopener,noreferrer');
  }, [ensAppBase, u.ensName]);

  const connectSocial = useCallback(
    async (platform: Platform) => {
      const username = window.prompt(`Enter your ${platform} username (without @)`);
      if (!username) return;

      setConnectBusy(platform);
      try {
        const contracts = (await import('@/lib/contracts').catch(() => null)) as
          | {
              connectSocial?: (platformId: number, username: string) => Promise<`0x${string}`>;
            }
          | null;

        if (contracts?.connectSocial) {
          await contracts.connectSocial(PLATFORM_IDS[platform], username);
        }
        // optimistic UI update (covers both real + mock)
        setUser(prev => {
          const baseUser = prev ?? mockUser;
          return {
            ...baseUser,
            socialProfiles: { ...baseUser.socialProfiles, [platform]: username },
          };
        });

        toast({
          title: 'Connected',
          description: `${platform} @${username} linked to your profile.`,
        });
      } catch (e: any) {
        toast({
          title: 'Failed to connect',
          description: e?.shortMessage || e?.message || 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setConnectBusy(null);
      }
    },
    [mockUser, toast]
  );

  const verifyWorldId = useCallback(async () => {
    if (!WORLD_APP_ID || !WORLD_ACTION_ID || !VERIFY_ENDPOINT) {
      toast({
        title: 'World ID not configured',
        description: 'Set VITE_WORLD_APP_ID, VITE_WORLD_ACTION_ID & VITE_API_BASE.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const worldid = (await import('@/lib/worldid').catch(() => null)) as
        | {
            verifyWithWorldID?: (opts: {
              appId: `app_${string}`;
              action: string;
              signal?: string;
              verificationLevel?: 'device' | 'orb' | 'phone';
              verifyEndpoint: string;
              includeCredentials?: boolean;
            }) => Promise<{ isVerified: boolean }>;
          }
        | null;

      if (!worldid?.verifyWithWorldID) {
        toast({
          title: 'World ID helper missing',
          description: 'Add src/lib/worldid.tsx with verifyWithWorldID.',
          variant: 'destructive',
        });
        return;
      }

      const { isVerified } = await worldid.verifyWithWorldID({
        appId: WORLD_APP_ID,
        action: WORLD_ACTION_ID,
        signal: u.address, // recommended as signal
        verificationLevel: 'orb',
        verifyEndpoint: VERIFY_ENDPOINT,
        includeCredentials: true,
      });

      if (isVerified) {
        setUser(prev => (prev ? { ...prev, isVerified: true } : prev));
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
    }
  }, [VERIFY_ENDPOINT, WORLD_ACTION_ID, WORLD_APP_ID, toast, u.address]);

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6 text-center">
          <UserAvatar user={u} size="lg" className="mx-auto mb-4" />
          <h2 className="font-semibold text-lg mb-2">
            {u.ensName || `${u.address.slice(0, 6)}...${u.address.slice(-4)}`}
          </h2>

          <KarmaDisplay
            karma={u.karma}
            size="lg"
            showLabel={false}
            className="justify-center mb-3"
          />

          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant={u.isVerified ? 'default' : 'secondary'} className="text-xs">
              {u.isVerified ? 'Verified ✓' : 'Not Verified'}
            </Badge>
            {!u.isVerified && (
              <Button size="sm" variant="outline" onClick={verifyWorldId} disabled={loading}>
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
            const busy = connectBusy === platform;
            return (
              <div key={platform} className="flex items-center justify-between">
                <span className="text-sm capitalize">{platform}</span>
                {username ? (
                  <Badge variant="secondary" className="text-xs">
                    @{username}
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connectSocial(platform)}
                    disabled={loading || busy}
                  >
                    {busy ? 'Connecting…' : 'Connect'}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={openAddressInExplorer}
                title="Open in explorer"
              >
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

export default ProfilePage;