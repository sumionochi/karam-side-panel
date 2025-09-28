// services/KarmaService.ts
import { ethers } from "ethers";
import {
  WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS,
  KARAM_CONTRACT_ABI,
  WORLD_SEPOLIA_RPC,
} from "@/constants/contract";

export interface UserKarmaData {
  address: string;
  karma: string; // human units (18d normalized)
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
  amount: string; // human units (18d normalized)
  reason: string;
  timestamp: number;
  type: "given" | "slashed";
  // optional helpers for UI
  slasher?: string;
  victim?: string;
}

const ZERO = "0x0000000000000000000000000000000000000000";

// helpers
const fmt = (x: bigint | number | string) => {
  try {
    // ethers v6 can format bigint directly
    return ethers.formatEther(x as any);
  } catch {
    return ethers.formatEther(BigInt(x as any));
  }
};

const lower = (s?: string | null) => (s ? s.toLowerCase() : s ?? "");

const normHandle = (h: string) => h.replace(/^@/, "").trim();

export class KarmaService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    // Keep your variable name; point it to World mainnet RPC in your constants
    this.provider = new ethers.JsonRpcProvider(WORLD_SEPOLIA_RPC);
    this.contract = new ethers.Contract(
      WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS,
      KARAM_CONTRACT_ABI,
      this.provider
    );
  }

  /** Optional helpers used by Admin/System */
  getContractAddress(): string {
    return WORLDSEPOLIA_KARAM_CONTRACT_ADDRESS;
  }

  async getChainInfo(): Promise<{ chainId: number; name?: string }> {
    const n = await this.provider.getNetwork();
    // ethers v6 -> chainId is bigint
    return { chainId: Number(n.chainId), name: n.name };
  }

  // -------------------- Core reads (Profile) --------------------

  async getUserKarmaData(address: string): Promise<UserKarmaData | null> {
    try {
      const [karma, isRegistered, socialConnections] = await Promise.all([
        this.contract.karma(address), // uint256
        this.contract.isRegistered(address), // bool
        this.contract.socialConnections(address), // struct { twitterUsername, githubUsername, discordUsername }
      ]);

      return {
        address,
        karma: fmt(karma),
        isRegistered: Boolean(isRegistered),
        socialConnections: {
          twitterUsername: socialConnections.twitterUsername,
          githubUsername: socialConnections.githubUsername,
          discordUsername: socialConnections.discordUsername,
        },
      };
    } catch (error) {
      console.error("Error fetching user karma data:", error);
      return null;
    }
  }

  /**
   * NEW: Direct, O(1) resolve using public mapping `twitterUsername(string) -> address`.
   * Tries a few normalized variants to handle user-entered case / leading '@'.
   */
  async getAddressByTwitterUsername(username: string): Promise<string | null> {
    const tries = [
      username,
      normHandle(username),
      "@" + normHandle(username),
      lower(username),
      lower("@" + normHandle(username)),
    ];

    for (const key of tries) {
      try {
        const addr: string = await this.contract.twitterUsername(key);
        if (addr && addr !== ZERO) return addr;
      } catch {
        // keep trying variants
      }
    }

    // Final fallback (slow): scan users and compare stored twitter usernames
    try {
      const users = await this.getAllUsers();
      for (const u of users) {
        try {
          const sc = await this.contract.socialConnections(u);
          if (lower(sc.twitterUsername) === lower(normHandle(username)))
            return u;
          if (lower(sc.twitterUsername) === lower("@" + normHandle(username)))
            return u;
          if (lower(sc.twitterUsername) === lower(username)) return u;
        } catch {}
      }
    } catch (e) {
      console.warn("Fallback scan failed:", e);
    }

    return null;
  }

  async getTwitterByAddress(address: string): Promise<string> {
    try {
      const sc = await this.contract.socialConnections(address);
      return sc?.twitterUsername || "";
    } catch {
      return "";
    }
  }

  // -------------------- Today / Totals --------------------

  async getUserUsageToday(
    address: string
  ): Promise<{ givenToday: number; slashedToday: number }> {
    try {
      const [g, s] = await Promise.all([
        this.contract.karmaGivenInDay(address),
        this.contract.karmaSlashedInDay(address),
      ]);
      return {
        givenToday: Number(ethers.formatEther(g)),
        slashedToday: Number(ethers.formatEther(s)),
      };
    } catch (e) {
      console.error("getUserUsageToday failed:", e);
      return { givenToday: 0, slashedToday: 0 };
    }
  }

  async getUserTotals(
    address: string
  ): Promise<{ totalReceived: number; totalSlashed: number }> {
    try {
      const [r, sl] = await Promise.all([
        this.contract.totalKarmaReceivedByUser(address),
        this.contract.totalKarmaSlashedOfUser(address),
      ]);
      return {
        totalReceived: Number(ethers.formatEther(r)),
        totalSlashed: Number(ethers.formatEther(sl)),
      };
    } catch (e) {
      console.error("getUserTotals failed:", e);
      return { totalReceived: 0, totalSlashed: 0 };
    }
  }

  // -------------------- Users / Directory --------------------

  async getAllUsers(): Promise<string[]> {
    // Fast path via new view
    try {
      const arr: string[] = await this.contract.getAllUsers();
      if (Array.isArray(arr)) return arr;
    } catch {}
    // Fallback: iterate public array allUsers(uint)
    const out: string[] = [];
    for (let i = 0; i < 100000; i++) {
      try {
        const a: string = await this.contract.allUsers(i);
        if (!a || a === ZERO) break;
        out.push(a);
      } catch {
        break;
      }
    }
    return out;
  }

  async getAllUsersLength(): Promise<number> {
    try {
      const list = await this.getAllUsers();
      return list.length;
    } catch {
      return 0;
    }
  }

  async getAllUsersAt(i: number): Promise<string | null> {
    try {
      const a: string = await this.contract.allUsers(i);
      return a || null;
    } catch {
      return null;
    }
  }

  // -------------------- Events / History --------------------

  /**
   * Fetch recent events (last `lookbackBlocks`) filtered to a user if provided.
   * We query "from=user" OR "to=user" (and slasher/victim) and merge results.
   */
  async getRecentKarmaEvents(
    userAddress?: string,
    lookbackBlocks = 200_000
  ): Promise<KarmaEvent[]> {
    try {
      const latest = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, latest - Math.max(1000, lookbackBlocks));
      return await this._fetchEvents(userAddress, fromBlock, latest);
    } catch (error) {
      console.error("Error fetching karma events:", error);
      return [];
    }
  }

  /**
   * All events in a range (use this for "All-time" / History).
   * If you know the deployment block, pass it as `fromBlock` for a true all-time scan.
   * Otherwise it behaves like "recent" with a default lookback.
   */
  async getAllKarmaEventsDetailed(
    userAddress?: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<KarmaEvent[]> {
    try {
      const latest = await this.provider.getBlockNumber();
      const start = fromBlock ?? Math.max(0, latest - 500_000); // default wider window
      const end = toBlock ?? latest;
      return await this._fetchEvents(userAddress, start, end);
    } catch (e) {
      console.error("getAllKarmaEventsDetailed failed:", e);
      return [];
    }
  }

  async getAllKarmaEvents(userAddress?: string): Promise<KarmaEvent[]> {
    // Alias to detailed with default window
    return this.getAllKarmaEventsDetailed(userAddress);
  }

  // ---- internal event fetcher (merges OR-filters and sorts) ----
  private async _fetchEvents(
    userAddress: string | undefined,
    fromBlock: number,
    toBlock: number
  ): Promise<KarmaEvent[]> {
    const out: KarmaEvent[] = [];

    // KarmaGiven has indexed: from, to
    const kgByFrom = this.contract.filters.KarmaGiven(
      userAddress ?? null,
      null
    );
    const kgByTo = this.contract.filters.KarmaGiven(null, userAddress ?? null);
    const kgAll = this.contract.filters.KarmaGiven(null, null);

    // KarmaSlashed has indexed: slasher, victim
    const ksBySlasher = this.contract.filters.KarmaSlashed(
      userAddress ?? null,
      null
    );
    const ksByVictim = this.contract.filters.KarmaSlashed(
      null,
      userAddress ?? null
    );
    const ksAll = this.contract.filters.KarmaSlashed(null, null);

    const jobs: Promise<any[]>[] = [];

    if (userAddress) {
      jobs.push(this.contract.queryFilter(kgByFrom, fromBlock, toBlock));
      jobs.push(this.contract.queryFilter(kgByTo, fromBlock, toBlock));
      jobs.push(this.contract.queryFilter(ksBySlasher, fromBlock, toBlock));
      jobs.push(this.contract.queryFilter(ksByVictim, fromBlock, toBlock));
    } else {
      jobs.push(this.contract.queryFilter(kgAll, fromBlock, toBlock));
      jobs.push(this.contract.queryFilter(ksAll, fromBlock, toBlock));
    }

    const settled = await Promise.allSettled(jobs);
    const logs: ethers.EventLog[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled") {
        for (const ev of s.value as ethers.EventLog[]) {
          if (ev && "args" in ev && ev.args) logs.push(ev);
        }
      }
    }

    for (const ev of logs) {
      const name = ev.fragment?.name || ev.eventName; // v6 keeps .fragment
      if (name === "KarmaGiven") {
        const { from, to, amount, reason, timestamp } = ev.args as any;
        out.push({
          from,
          to,
          amount: fmt(amount),
          reason,
          timestamp: Number(timestamp),
          type: "given",
        });
      } else if (name === "KarmaSlashed") {
        const { slasher, victim, amount, reason, timestamp } = ev.args as any;
        out.push({
          from: slasher,
          to: victim,
          amount: fmt(amount),
          reason,
          timestamp: Number(timestamp),
          type: "slashed",
          slasher,
          victim,
        });
      }
    }

    // sort newest-first
    out.sort((a, b) => b.timestamp - a.timestamp);
    return out;
  }
}
