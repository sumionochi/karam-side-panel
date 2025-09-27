// TODO: Replace with actual smart contract types
export interface User {
  id: string;
  ensName?: string;
  address: string;
  karma: number;
  isVerified: boolean;
  socialProfiles: {
    twitter?: string;
    github?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  avatar?: string;
  bio?: string;
  totalGiven: number;
  totalReceived: number;
  dailyGiveLimit: number;
  dailySlashLimit: number;
  dailyGiveUsed: number;
  dailySlashUsed: number;
  lastActivity: Date;
}

export interface KarmaTransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: 'give' | 'slash' | 'redistribution' | 'social_bonus';
  timestamp: Date;
  txHash?: string; // TODO: Add when smart contracts are integrated
  reason?: string;
}

export interface LeaderboardEntry {
  user: User;
  rank: number;
  change: number; // Change in rank from last period
}

// Smart contract integration interfaces
export interface WorldIDVerification {
  // TODO: Implement World ID verification
  isVerified: boolean;
  proof?: string;
  merkleRoot?: string;
  nullifierHash?: string;
}

export interface PyththNetworkConfig {
  // TODO: Configure Pyth Network integration
  entropyEndpoint: string;
  priceFeeds: {
    ethUsd: string;
    usdcUsd: string;
    usdtUsd: string;
  };
}

export interface SmartContractConfig {
  // TODO: Add deployed contract addresses
  karmaTokenContract: string;
  karmaDistributorContract: string;
  ensResolverContract: string;
  worldchainRpcUrl: string;
}