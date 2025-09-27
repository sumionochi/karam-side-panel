// src/types/karma.ts

/** ──────────────────────────────────────────────────────────────────────────────
 *  Core time type used across UI + indexer
 *  Allow number (ms), ISO string, Date; normalize via a helper when needed.
 *  ─────────────────────────────────────────────────────────────────────────── */
export type KarmaTimestamp = number | string | Date | undefined;

/** Social platforms supported ON-CHAIN (Karam.sol) */
export type SocialPlatform = "twitter" | "github" | "discord";

/** Map to on-chain platform ids used by connectSocial(uint8) */
export const SOCIAL_PLATFORM_ID: Record<SocialPlatform, 0 | 1 | 2> = {
  twitter: 0,
  github: 1,
  discord: 2,
};

/** Contract constants (mirror of Karam.sol) — useful for UI limits */
export const CONTRACT_LIMITS = {
  START_KARMA: 500,
  SOCIAL_BONUS: 10,
  MAX_GIVE_PER_TARGET_PER_DAY: 5,
  MAX_GIVE_PER_DAY: 30,
  MAX_SLASH_PER_TARGET_PER_DAY: 5,
  MAX_SLASH_PER_DAY: 20,
} as const;

/** Minimal on-chain user shape, extended with off-chain/indexer fields for UI */
export interface User {
  /** Stable id for UI; by convention we use the address */
  id: string;

  /** On-chain address */
  address: string;

  /** Current karma balance (UI uses number; convert from bigint in your data layer) */
  karma: number;

  /** Optional ENS name (off-chain lookup) */
  ensName?: string;

  /** World ID flag (off-chain verification) */
  isVerified: boolean;

  /** Socials supported by the contract; UI may show only these for “Connect” */
  socialProfiles: {
    twitter?: string;
    github?: string;
    discord?: string;
    /** Optional extras for UI (not on-chain) */
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };

  /** Optional avatar/bio (off-chain) */
  avatar?: string;
  bio?: string;

  /** Off-chain/indexer stats for UI convenience */
  totalGiven: number;
  totalReceived: number;

  /** Daily caps (UI constants); usage read from getDailyUsage() */
  dailyGiveLimit: number; // 30
  dailySlashLimit: number; // 20
  dailyGiveUsed: number; // from contract.getDailyUsage.totalGivenToday
  dailySlashUsed: number; // from contract.getDailyUsage.totalSlashedToday

  /** Derived from most recent event touching this user (off-chain) */
  lastActivity?: KarmaTimestamp;
}

/** Transaction/event model normalized for the UI */
export interface KarmaTransaction {
  id: string; // usually `${txHash}:${logIndex}` from indexer
  from: string; // address
  to: string; // address
  amount: number; // convert from bigint for UI
  type: "give" | "slash" | "registered" | "social_connected";
  timestamp?: KarmaTimestamp;
  txHash?: string;
  reason?: string; // from Gave(reason)
  /** Slashed only: self-tax (ceil(amount/5)) */
  tax?: number;
  /** Social_connected only */
  platform?: SocialPlatform;
  username?: string;
}

/** Leaderboard entry (off-chain/indexer aggregation) */
export interface LeaderboardEntry {
  user: User;
  rank: number;
  change: number; // delta in rank
}

/** Contract view helpers */
export interface DailyUsage {
  dayIdx: number;
  totalGivenToday: number;
  totalSlashedToday: number;
}

export interface PerRecipientUsage {
  givenToToday: number;
  slashedToToday: number;
}

/** World ID verification payload (off-chain) */
export interface WorldIDVerification {
  isVerified: boolean;
  proof?: string;
  merkleRoot?: string;
  nullifierHash?: string;
}

/** Optional Pyth integration config (off-chain) */
export interface PythNetworkConfig {
  entropyEndpoint?: string;
  priceFeeds?: {
    ethUsd?: string;
    usdcUsd?: string;
    usdtUsd?: string;
  };
}

/** Client/SDK config for contracts + envs */
export interface SmartContractConfig {
  karamAddress: string; // deployed Karam.sol
  rpcUrl: string; // Worldchain (or chosen) RPC
  chainId: number; // numeric chain id
  explorerBase?: string; // e.g., https://explorer.world.org
  ensRpcUrl?: string; // if ENS is on another chain
  worldIdAppId?: string; // World ID app id (for UI)
}
