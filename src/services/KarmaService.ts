import { ethers } from 'ethers';
import { WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS, KARAM_CONTRACT_ABI, WORLD_SEPOLIA_RPC } from '@/constants/contract';

export interface UserKarmaData {
  address: string;
  karma: string;
  isRegistered: boolean;
  socialConnections: {
    twitterUsername: string;
    githubUsername: string;
    discordUsername: string;
  };
}

export interface KarmaEvent {
  from: string;
  to: string;
  amount: string;
  reason: string;
  timestamp: number;
  type: 'given' | 'slashed';
}

export class KarmaService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(WORLD_SEPOLIA_RPC);
    this.contract = new ethers.Contract(
      WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS,
      KARAM_CONTRACT_ABI,
      this.provider
    );
  }

  async getUserKarmaData(address: string): Promise<UserKarmaData | null> {
    try {
      const [karma, isRegistered, socialConnections] = await Promise.all([
        this.contract.karma(address),
        this.contract.isRegistered(address),
        this.contract.socialConnections(address)
      ]);

      return {
        address,
        karma: ethers.formatEther(karma),
        isRegistered,
        socialConnections: {
          twitterUsername: socialConnections.twitterUsername,
          githubUsername: socialConnections.githubUsername,
          discordUsername: socialConnections.discordUsername
        }
      };
    } catch (error) {
      console.error('Error fetching user karma data:', error);
      return null;
    }
  }

  async getAddressByTwitterUsername(username: string): Promise<string | null> {
    try {
      // Since the contract doesn't have a direct getter for twitterUsername mapping,
      // we need to query all users and check their social connections
      const allUsersCount = await this.getAllUsersCount();
      
      for (let i = 0; i < allUsersCount; i++) {
        try {
          const userAddress = await this.contract.allUsers(i);
          const socialConnections = await this.contract.socialConnections(userAddress);
          
          if (socialConnections.twitterUsername.toLowerCase() === username.toLowerCase()) {
            return userAddress;
          }
        } catch (error) {
          // Continue if error fetching individual user
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding address by Twitter username:', error);
      return null;
    }
  }

  async getAllUsersCount(): Promise<number> {
    try {
      let count = 0;
      while (true) {
        try {
          await this.contract.allUsers(count);
          count++;
        } catch {
          break;
        }
      }
      return count;
    } catch (error) {
      console.error('Error getting all users count:', error);
      return 0;
    }
  }

  async getRecentKarmaEvents(userAddress?: string): Promise<KarmaEvent[]> {
    try {
      const events: KarmaEvent[] = [];
      
      // Get KarmaGiven events
      const karmaGivenFilter = this.contract.filters.KarmaGiven(
        userAddress || null,
        userAddress || null
      );
      const karmaGivenEvents = await this.contract.queryFilter(karmaGivenFilter, -1000);
      
      karmaGivenEvents.forEach(event => {
        // Type guard to check if it's an EventLog with args
        if ('args' in event && event.args) {
          events.push({
            from: event.args.from,
            to: event.args.to,
            amount: ethers.formatEther(event.args.amount),
            reason: event.args.reason,
            timestamp: Number(event.args.timestamp),
            type: 'given'
          });
        }
      });

      // Get KarmaSlashed events
      const karmaSlashedFilter = this.contract.filters.KarmaSlashed(
        userAddress || null,
        userAddress || null
      );
      const karmaSlashedEvents = await this.contract.queryFilter(karmaSlashedFilter, -1000);
      
      karmaSlashedEvents.forEach(event => {
        // Type guard to check if it's an EventLog with args  
        if ('args' in event && event.args) {
          events.push({
            from: event.args.slasher,
            to: event.args.victim,
            amount: ethers.formatEther(event.args.amount),
            reason: event.args.reason,
            timestamp: Number(event.args.timestamp),
            type: 'slashed'
          });
        }
      });

      // Sort by timestamp (most recent first)
      return events.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching karma events:', error);
      return [];
    }
  }
}