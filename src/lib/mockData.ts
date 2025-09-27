import { User, KarmaTransaction, LeaderboardEntry } from '@/types/karma';

// Mock data for development - TODO: Replace with smart contract calls
export const mockCurrentUser: User = {
  id: '1',
  ensName: 'saint.karma.eth',
  address: '0x742d35Cc6F9C98e1BD8dC8c3B4d89c12312',
  karma: 420,
  isVerified: true,
  socialProfiles: {
    twitter: 'awesamarth_',
    github: 'awesamarth',
  },
  avatar: 'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg',
  bio: 'Building the future of social reputation 🌟',
  totalGiven: 150,
  totalReceived: 200,
  dailyGiveLimit: 30,
  dailySlashLimit: 20,
  dailyGiveUsed: 15,
  dailySlashUsed: 5,
  lastActivity: new Date('2024-01-15'),
};

export const mockUsers: User[] = [
  {
    id: '2',
    ensName: 'god.karma.eth',
    address: '0x123d35Cc6F9C98e1BD8dC8c3B4d89c45678',
    karma: 1250,
    isVerified: true,
    socialProfiles: { twitter: 'vitalikbuterin', github: 'vbuterin' },
    totalGiven: 500,
    totalReceived: 800,
    dailyGiveLimit: 30,
    dailySlashLimit: 20,
    dailyGiveUsed: 0,
    dailySlashUsed: 0,
    lastActivity: new Date('2024-01-15'),
  },
  {
    id: '3',
    ensName: 'angel.karma.eth',
    address: '0x456d35Cc6F9C98e1BD8dC8c3B4d89c91011',
    karma: 890,
    isVerified: true,
    socialProfiles: { twitter: 'aantonop', github: 'aantonop' },
    totalGiven: 300,
    totalReceived: 450,
    dailyGiveLimit: 30,
    dailySlashLimit: 20,
    dailyGiveUsed: 10,
    dailySlashUsed: 2,
    lastActivity: new Date('2024-01-14'),
  },
  {
    id: '4',
    address: '0x789d35Cc6F9C98e1BD8dC8c3B4d89c12131',
    karma: 650,
    isVerified: true,
    socialProfiles: { twitter: 'elonmusk' },
    totalGiven: 200,
    totalReceived: 350,
    dailyGiveLimit: 30,
    dailySlashLimit: 20,
    dailyGiveUsed: 20,
    dailySlashUsed: 8,
    lastActivity: new Date('2024-01-13'),
  },
  {
    id: '5',
    address: '0x101d35Cc6F9C98e1BD8dC8c3B4d89c14151',
    karma: 280,
    isVerified: false,
    socialProfiles: { twitter: 'user123' },
    totalGiven: 50,
    totalReceived: 180,
    dailyGiveLimit: 30,
    dailySlashLimit: 20,
    dailyGiveUsed: 5,
    dailySlashUsed: 1,
    lastActivity: new Date('2024-01-12'),
  },
];

export const mockTransactions: KarmaTransaction[] = [
  {
    id: '1',
    from: '2',
    to: '1',
    amount: 5,
    type: 'give',
    timestamp: new Date('2024-01-15T10:30:00'),
    reason: 'Great contribution to the community!',
  },
  {
    id: '2',
    from: '1',
    to: '3',
    amount: 3,
    type: 'give',
    timestamp: new Date('2024-01-15T09:15:00'),
    reason: 'Helpful tutorial',
  },
  {
    id: '3',
    from: '4',
    to: '5',
    amount: -2,
    type: 'slash',
    timestamp: new Date('2024-01-14T16:45:00'),
    reason: 'Spam behavior',
  },
  {
    id: '4',
    from: 'system',
    to: '1',
    amount: 10,
    type: 'social_bonus',
    timestamp: new Date('2024-01-14T12:00:00'),
    reason: 'Connected Twitter account',
  },
  {
    id: '5',
    from: 'system',
    to: '1',
    amount: 84,
    type: 'redistribution',
    timestamp: new Date('2024-01-10T00:00:00'),
    reason: 'Random redistribution event',
  },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { user: mockUsers[0], rank: 1, change: 0 },
  { user: mockUsers[1], rank: 2, change: 1 },
  { user: mockCurrentUser, rank: 3, change: -1 },
  { user: mockUsers[2], rank: 4, change: 2 },
  { user: mockUsers[3], rank: 5, change: -2 },
];

// Mock functions for smart contract interactions
export const mockSmartContractFunctions = {
  // TODO: Replace with actual World ID verification
  verifyWorldID: async (proof: any): Promise<boolean> => {
    console.log('🌍 TODO: Integrate World ID verification', proof);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  },

  // TODO: Replace with actual ENS resolution
  resolveENS: async (ensName: string): Promise<string | null> => {
    console.log('🏷️ TODO: Integrate ENS resolution for', ensName);
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockMappings: Record<string, string> = {
      'god.karma.eth': '0x123d35Cc6F9C98e1BD8dC8c3B4d89c45678',
      'angel.karma.eth': '0x456d35Cc6F9C98e1BD8dC8c3B4d89c91011',
      'saint.karma.eth': '0x742d35Cc6F9C98e1BD8dC8c3B4d89c12312',
    };
    return mockMappings[ensName] || null;
  },

  // TODO: Replace with actual karma transfer smart contract call
  giveKarma: async (to: string, amount: number, reason?: string): Promise<string> => {
    console.log('💫 TODO: Execute karma transfer smart contract', { to, amount, reason });
    await new Promise(resolve => setTimeout(resolve, 2000));
    return '0x' + Math.random().toString(16).substr(2, 64); // Mock transaction hash
  },

  // TODO: Replace with actual karma slash smart contract call
  slashKarma: async (to: string, amount: number, reason?: string): Promise<string> => {
    console.log('⚡ TODO: Execute karma slash smart contract', { to, amount, reason });
    await new Promise(resolve => setTimeout(resolve, 2000));
    return '0x' + Math.random().toString(16).substr(2, 64); // Mock transaction hash
  },

  // TODO: Replace with Pyth Network VRF call
  triggerRedistribution: async (): Promise<boolean> => {
    console.log('🎲 TODO: Integrate Pyth Network VRF for redistribution');
    await new Promise(resolve => setTimeout(resolve, 3000));
    return true;
  },

  // TODO: Replace with Pyth Network price feeds
  getPriceFeeds: async (): Promise<{ ethUsd: number; usdcUsd: number; usdtUsd: number }> => {
    console.log('💱 TODO: Integrate Pyth Network price feeds');
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      ethUsd: 2300.50,
      usdcUsd: 1.00,
      usdtUsd: 0.99,
    };
  },
};