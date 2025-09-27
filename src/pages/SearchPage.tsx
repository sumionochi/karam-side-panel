import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/UserCard';
import { KarmaModal } from '@/components/KarmaModal';
import { User } from '@/types/karma';
import { mockUsers, mockCurrentUser, mockSmartContractFunctions } from '@/lib/mockData';
import { Search, Scan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useXHandle } from '@/hooks/use-xhandle';

function looksLikeAddress(q: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(q.trim());
}
function looksLikeENS(q: string) {
  return /\./.test(q) && !q.startsWith('0x'); // simple heuristic
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
    /* if (!q) return;

    setIsSearching(true);
    try {
      // try dynamic imports so this compiles even before real libs exist
      const ens: any = await import('@/lib/ens').catch(() => null);
      const indexer: any = await import('@/lib/indexer').catch(() => null);

      // 1) address / ENS short-circuit (preferred)
      if (looksLikeAddress(q)) {
        if (indexer?.fetchProfileByAddress) {
          const u = await indexer.fetchProfileByAddress(q);
          setSearchResults(u ? [u] : []);
        } else {
          // mock fallback
          setSearchResults(mockUsers.filter(u => u.address.toLowerCase() === q.toLowerCase()));
        }
        if (searchResults.length === 0) {
          toast({ title: 'No users found', description: 'Address not linked to a Karam profile yet.' });
        }
        return;
      }

      if (looksLikeENS(q)) {
        let addr: string | null = null;
        if (ens?.resolveName) {
          try {
            addr = await ens.resolveName(q);
          } catch { addr = null; }
        }
        if (addr && indexer?.fetchProfileByAddress) {
          const u = await indexer.fetchProfileByAddress(addr);
          setSearchResults(u ? [u] : []);
        } else {
          // mock ENS fallback
          const results = mockUsers.filter(u =>
            (u.ensName?.toLowerCase() === q.toLowerCase()) ||
            (u.address.toLowerCase() === (addr ?? '').toLowerCase())
          );
          setSearchResults(results);
        }

        if (searchResults.length === 0) {
          toast({ title: 'No users found', description: 'ENS resolved but user not on Karam yet.' });
        }
        return;
      }

      // 2) free-text / social search
      if (indexer?.searchProfiles) {
        const results = await indexer.searchProfiles(q);
        setSearchResults(results ?? []);
        if (!results || results.length === 0) {
          toast({ title: 'No users found', description: 'Try ENS, wallet address, or exact social handle.' });
        }
      } else {
        // mock search logic (fallback)
        await new Promise(r => setTimeout(r, 600));
        const results = mockUsers.filter(user =>
          user.ensName?.toLowerCase().includes(q.toLowerCase()) ||
          user.address.toLowerCase().includes(q.toLowerCase()) ||
          Object.values(user.socialProfiles).some(profile =>
            profile?.toLowerCase().includes(q.toLowerCase())
          )
        );
        setSearchResults(results);
        if (results.length === 0) {
          toast({ title: 'No users found', description: 'Try ENS name, address, or social handle' });
        }
      }
    } finally {
      setIsSearching(false);
    } */
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
   /*  try {
      const indexer: any = await import('@/lib/indexer').catch(() => null);

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
        const twitterUser = mockUsers.find(u => !!u.socialProfiles.twitter);
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
    } */
  };

  const handleKarmaTransaction = async (amount: number, reason: string) => {
    if (!selectedUser) return;

    /* try {
      const contracts: any = await import('@/lib/contracts').catch(() => null);

      if (modalType === 'give') {
        if (contracts?.giveKarma) {
          await contracts.giveKarma(selectedUser.address, amount, reason);
        } else {
          // mock
          await mockSmartContractFunctions.giveKarma(selectedUser.address, amount, reason);
        }
        toast({
          title: 'Karma sent! ✨',
          description: `Sent ${amount} karma to ${selectedUser.ensName || selectedUser.address}`,
        });
      } else {
        if (contracts?.slashKarma) {
          await contracts.slashKarma(selectedUser.address, amount);
        } else {
          // mock
          await mockSmartContractFunctions.slashKarma(selectedUser.address, amount, reason);
        }
        toast({
          title: 'Karma slashed ⚡',
          description: `Slashed ${amount} karma from ${selectedUser.ensName || selectedUser.address}`,
        });
      }

      // optional: refresh results/profile after tx via indexer
      // const indexer: any = await import('@/lib/indexer').catch(() => null);
      // if (indexer?.refresh) await indexer.refresh();

      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Transaction failed',
        description: error?.shortMessage || error?.message || 'Please try again later',
        variant: 'destructive',
      });
    } */
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

        <Button
          variant="outline"
          onClick={handleTwitterSearch}
          className="w-full"
          size="sm"
        >
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
