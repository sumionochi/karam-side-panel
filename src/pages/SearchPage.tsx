import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/UserCard';
import { KarmaModal } from '@/components/KarmaModal';
import { User } from '@/types/karma';
import { mockUsers, mockCurrentUser, mockSmartContractFunctions } from '@/lib/mockData';
import { Search, Scan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalType, setModalType] = useState<'give' | 'slash'>('give');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // TODO: Replace with actual ENS resolution and user lookup from smart contract
      console.log('🔍 Searching for:', searchQuery);
      
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock search logic
      const results = mockUsers.filter(user => 
        user.ensName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(user.socialProfiles).some(profile => 
          profile?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      
      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: "No users found",
          description: "Try searching by ENS name, address, or social handle",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleTwitterSearch = () => {
    // TODO: Integrate with Twitter page detection from extension context
    console.log('🐦 TODO: Get current Twitter page username from extension context');
    
    // Mock: simulate finding user from current Twitter page
    const twitterUser = mockUsers.find(user => user.socialProfiles.twitter);
    if (twitterUser) {
      setSearchResults([twitterUser]);
      toast({
        title: "Found user from Twitter page!",
        description: `Found ${twitterUser.ensName || twitterUser.address}`,
      });
    } else {
      toast({
        title: "User not registered",
        description: "This Twitter user hasn't joined Karam yet",
        variant: "destructive",
      });
    }
  };

  const openKarmaModal = (user: User, type: 'give' | 'slash') => {
    setSelectedUser(user);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleKarmaTransaction = async (amount: number, reason: string) => {
    if (!selectedUser) return;
    
    try {
      if (modalType === 'give') {
        // TODO: Replace with actual smart contract call
        const txHash = await mockSmartContractFunctions.giveKarma(
          selectedUser.address, 
          amount, 
          reason
        );
        toast({
          title: "Karma sent! ✨",
          description: `Sent ${amount} karma to ${selectedUser.ensName || selectedUser.address}`,
        });
      } else {
        // TODO: Replace with actual smart contract call
        const txHash = await mockSmartContractFunctions.slashKarma(
          selectedUser.address, 
          amount, 
          reason
        );
        toast({
          title: "Karma slashed ⚡",
          description: `Slashed ${amount} karma from ${selectedUser.ensName || selectedUser.address}`,
        });
      }
    } catch (error) {
      toast({
        title: "Transaction failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const getMaxAmount = () => {
    if (modalType === 'give') {
      return Math.min(5, mockCurrentUser.dailyGiveLimit - mockCurrentUser.dailyGiveUsed);
    } else {
      return Math.min(5, mockCurrentUser.dailySlashLimit - mockCurrentUser.dailySlashUsed);
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
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
          Find user from current Twitter page
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