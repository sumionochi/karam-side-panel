import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/UserCard';
import { KarmaModal } from '@/components/KarmaModal';
import type { User } from '@/types/karma';
import { mockUsers, mockCurrentUser, mockSmartContractFunctions } from '@/lib/mockData';
import { Search, Scan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useXHandle } from '@/hooks/use-xhandle';

function looksLikeAddress(q: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(q.trim());
}
function looksLikeENS(q: string) {
  const s = q.trim();
  return s.includes('.') && !s.startsWith('0x');
}

export const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalType, setModalType] = useState<'give' | 'slash'>('give');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const { handle: xHandle } = useXHandle();

  const openKarmaModal = (user: User, type: 'give' | 'slash') => {
    setSelectedUser(user);
    setModalType(type);
    setIsModalOpen(true);
  };

  const getMaxAmount = () => {
    if (modalType === 'give') {
      return Math.min(5, mockCurrentUser.dailyGiveLimit - mockCurrentUser.dailyGiveUsed);
    } else {
      return Math.min(5, mockCurrentUser.dailySlashLimit - mockCurrentUser.dailySlashUsed);
    }
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      // Try dynamic imports so the app builds even if libs aren’t present yet
      const indexer = (await import('@/lib/indexer').catch(() => null)) as
        | {
            fetchProfileByAddress?: (addr: string) => Promise<User | null>;
            fetchProfileByXHandle?: (handle: string) => Promise<User | null>;
            searchProfiles?: (q: string) => Promise<User[]>;
          }
        | null;

      const ens = (await import('@/lib/ens').catch(() => null)) as
        | {
            resolveName?: (name: string) => Promise<string | null>;
          }
        | null;

      // 1) Direct address
      if (looksLikeAddress(q)) {
        let u: User | null = null;
        if (indexer?.fetchProfileByAddress) {
          u = await indexer.fetchProfileByAddress(q);
        } else {
          u = mockUsers.find((m) => m.address.toLowerCase() === q.toLowerCase()) as User | null;
        }
        setSearchResults(u ? [u] : []);
        if (!u) {
          toast({
            title: 'No users found',
            description: 'Address not linked to a Karam profile yet.',
          });
        }
        return;
      }

      // 2) ENS
      if (looksLikeENS(q)) {
        let addr: string | null = null;
        if (ens?.resolveName) {
          try {
            addr = await ens.resolveName(q);
          } catch {
            addr = null;
          }
        }
        if (addr && indexer?.fetchProfileByAddress) {
          const u = await indexer.fetchProfileByAddress(addr);
          setSearchResults(u ? [u] : []);
          if (!u) {
            toast({
              title: 'No users found',
              description: 'ENS resolved but user not on Karam yet.',
            });
          }
        } else {
          // mock ENS fallback: match by ensName or resolved addr
          const results = mockUsers.filter(
            (u) =>
              u.ensName?.toLowerCase() === q.toLowerCase() ||
              (addr && u.address.toLowerCase() === addr.toLowerCase())
          ) as User[];
          setSearchResults(results);
          if (results.length === 0) {
            toast({
              title: 'No users found',
              description: 'ENS resolved but no profile found.',
            });
          }
        }
        return;
      }

      // 3) If user typed @handle, try X handle
      if (q.startsWith('@')) {
        const handleOnly = q.replace(/^@/, '');
        let u: User | null = null;
        if (indexer?.fetchProfileByXHandle) {
          u = await indexer.fetchProfileByXHandle(handleOnly);
        } else {
          u = (mockUsers.find((m) => m.socialProfiles.twitter?.toLowerCase() === handleOnly.toLowerCase()) ??
            null) as User | null;
        }
        setSearchResults(u ? [u] : []);
        if (!u) {
          toast({
            title: 'No users found',
            description: 'This handle is not linked to any profile yet.',
          });
        }
        return;
      }

      // 4) Free-text search via indexer, fallback to mock fuzzy
      if (indexer?.searchProfiles) {
        const results = (await indexer.searchProfiles(q)) ?? [];
        setSearchResults(results);
        if (results.length === 0) {
          toast({
            title: 'No users found',
            description: 'Try ENS, wallet address, or exact social handle.',
          });
        }
      } else {
        // mock fuzzy search
        await new Promise((r) => setTimeout(r, 400));
        const results = mockUsers.filter((user) => {
          const ql = q.toLowerCase();
          return (
            user.ensName?.toLowerCase().includes(ql) ||
            user.address.toLowerCase().includes(ql) ||
            Object.values(user.socialProfiles).some((profile) =>
              profile?.toLowerCase().includes(ql)
            )
          );
        }) as User[];
        setSearchResults(results);
        if (results.length === 0) {
          toast({
            title: 'No users found',
            description: 'Try ENS name, address, or social handle.',
          });
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleTwitterSearch = async () => {
    if (!xHandle) {
      toast({
        title: 'Open a Twitter profile',
        description: 'Visit x.com/<handle> and reopen the sidepanel to auto-detect the user.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      const indexer = (await import('@/lib/indexer').catch(() => null)) as
        | { fetchProfileByXHandle?: (handle: string) => Promise<User | null> }
        | null;

      if (indexer?.fetchProfileByXHandle) {
        const user = await indexer.fetchProfileByXHandle(xHandle);
        if (user) {
          setSearchResults([user]);
          toast({
            title: 'Found user from Twitter page!',
            description: `Loaded @${xHandle}`,
          });
        } else {
          setSearchResults([]);
          toast({
            title: 'User not registered',
            description: 'This Twitter user hasn’t joined Karam yet',
            variant: 'destructive',
          });
        }
      } else {
        // mock fallback: pick a user with any twitter handle
        const twitterUser = mockUsers.find((u) => !!u.socialProfiles.twitter) as User | undefined;
        if (twitterUser) {
          setSearchResults([twitterUser]);
          toast({
            title: 'Found user from Twitter page! (mock)',
            description: `Found ${twitterUser.ensName || twitterUser.address}`,
          });
        } else {
          setSearchResults([]);
          toast({
            title: 'User not registered',
            description: 'This Twitter user hasn’t joined Karam yet',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleKarmaTransaction = async (amount: number, reason: string) => {
    if (!selectedUser) return;

    try {
      const contracts = (await import('@/lib/contracts').catch(() => null)) as
        | {
            giveKarma?: (to: string, amount: number, reason: string) => Promise<`0x${string}`>;
            slashKarma?: (to: string, amount: number) => Promise<`0x${string}`>;
          }
        | null;

      if (modalType === 'give') {
        if (contracts?.giveKarma) {
          await contracts.giveKarma(selectedUser.address, amount, reason || '');
        } else {
          // mock path
          await mockSmartContractFunctions.giveKarma(selectedUser.address, amount, reason || '');
        }
        toast({
          title: 'Karma sent! ✨',
          description: `Sent ${amount} karma to ${selectedUser.ensName || selectedUser.address}`,
        });
      } else {
        if (contracts?.slashKarma) {
          await contracts.slashKarma(selectedUser.address, amount);
        } else {
          // mock path
          await mockSmartContractFunctions.slashKarma(selectedUser.address, amount, reason || '');
        }
        toast({
          title: 'Karma slashed ⚡',
          description: `Slashed ${amount} karma from ${selectedUser.ensName || selectedUser.address}`,
        });
      }

      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Transaction failed',
        description: error?.shortMessage || error?.message || 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search Input */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search ENS, address, or @twitter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching} size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" onClick={handleTwitterSearch} className="w-full" size="sm">
          <Scan className="h-4 w-4 mr-2" />
          Find user from current Twitter page {xHandle ? `( @${xHandle} )` : ''}
        </Button>
      </div>

      {/* Search Results */}
      <div className="space-y-3">
        {isSearching && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Searching users...</p>
          </div>
        )}

        {!isSearching && searchResults.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No users found</p>
            <p className="text-sm">Try searching by ENS name, address, or social handle</p>
          </div>
        )}

        {searchResults.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            onGiveKarma={() => openKarmaModal(user, 'give')}
            onSlashKarma={() => openKarmaModal(user, 'slash')}
          />
        ))}
      </div>

      {/* Karma Modal */}
      {selectedUser && (
        <KarmaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={selectedUser}
          type={modalType}
          onSubmit={handleKarmaTransaction}
          maxAmount={getMaxAmount()}
        />
      )}
    </div>
  );
};