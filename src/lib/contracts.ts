// src/lib/contracts.ts
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  parseAbi,
  getAddress,
  getContract,
  type Address,
  type Hash,
} from "viem";
import type { DailyUsage, PerRecipientUsage } from "@/types/karma";

/** ───────────────────────── ENV */
const RPC_URL = import.meta.env.VITE_RPC_URL as string;
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 0);
const KARAM_ADDRESS = import.meta.env.VITE_KARAM_ADDRESS as `0x${string}`;

/** ───────────────────────── Chain & Clients */
const chain = defineChain({
  id: CHAIN_ID,
  name: "Worldchain",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const injected = typeof window !== "undefined" && (window as any).ethereum;
export const walletClient = injected
  ? createWalletClient({ chain, transport: custom((window as any).ethereum) })
  : null;

async function ensureAccount(): Promise<Address> {
  if (!walletClient) throw new Error("No injected wallet available.");
  try {
    const addrs = await walletClient.getAddresses();
    if (addrs.length) return addrs[0]!;
  } catch {
    /* noop */
  }
  await (window as any).ethereum?.request?.({ method: "eth_requestAccounts" });
  const addrs = await walletClient.getAddresses();
  if (!addrs?.length) throw new Error("Wallet has no accounts.");
  return addrs[0]!;
}

/** ───────────────────────── ABI (Karam.sol) */
const ABI = parseAbi([
  "function karma(address) view returns (uint256)",
  "function socialConnections(address) view returns (string twitterUsername, string githubUsername, string discordUsername)",
  "function getDailyUsage(address) view returns (uint256 dayIdx, uint256 totalGivenToday, uint256 totalSlashedToday)",
  "function getPerRecipientUsage(address,address) view returns (uint256 givenToToday, uint256 slashedToToday)",
  "function register()",
  "function connectSocial(uint8 _platform, string _username)",
  "function giveKarma(address _to, uint256 _amount, string _reason)",
  "function slashKarma(address _to, uint256 _amount)",
  "event Registered(address indexed user, uint256 startKarma)",
  "event SocialConnected(address indexed user, uint8 indexed platform, string username, uint256 bonus)",
  "event Gave(address indexed from, address indexed to, uint256 amount, string reason)",
  "event Slashed(address indexed from, address indexed to, uint256 amount, uint256 selfTax)",
] as const);

/** ───────────────────────── Contract Instance (reads via direct client calls) */

/* ---------------------------- READ ACTIONS (direct client calls) ---------------------------- */
/* export async function getKarma(addr: string): Promise<number> {
  const out = await publicClient.readContract({
    address: KARAM_ADDRESS,
    abi: ABI,
    functionName: "karma",
    args: [getAddress(addr)],
  });
  return Number(out as bigint);
}

export async function getDailyUsage(addr: string): Promise<DailyUsage> {
  const result = await publicClient.readContract({
    address: KARAM_ADDRESS,
    abi: ABI,
    functionName: "getDailyUsage",
    args: [getAddress(addr)],
  });
  const [dayIdx, given, slashed] = result as [bigint, bigint, bigint];
  return {
    dayIdx: Number(dayIdx),
    totalGivenToday: Number(given),
    totalSlashedToday: Number(slashed),
  };
}

export async function getPerRecipientUsage(
  user: string,
  other: string
): Promise<PerRecipientUsage> {
  const result = await publicClient.readContract({
    address: KARAM_ADDRESS,
    abi: ABI,
    functionName: "getPerRecipientUsage",
    args: [getAddress(user), getAddress(other)],
  });
  const [givenTo, slashedTo] = result as [bigint, bigint];
  return {
    givenToToday: Number(givenTo),
    slashedToToday: Number(slashedTo),
  };
}

export async function getSocialConnections(addr: string): Promise<{
  twitterUsername: string;
  githubUsername: string;
  discordUsername: string;
}> {
  const result = await publicClient.readContract({
    address: KARAM_ADDRESS,
    abi: ABI,
    functionName: "socialConnections",
    args: [getAddress(addr)],
  });
  const [tw, gh, dc] = result as [string, string, string];
  return { twitterUsername: tw, githubUsername: gh, discordUsername: dc };
} */

/* ---------------------------- WRITE ACTIONS (simulate → write) --------------------------- */
export async function register(): Promise<Hash> {
  if (!walletClient) throw new Error("No injected wallet available.");
  const account = await ensureAccount();

  const { request } = await publicClient.simulateContract({
    address: KARAM_ADDRESS,
    abi: ABI,
    functionName: "register",
    account,
  });
  return walletClient.writeContract(request);
}

export async function connectSocial(
  platformId: number,
  username: string
): Promise<Hash> {
  if (!walletClient) throw new Error("No injected wallet available.");
  const account = await ensureAccount();

  const { request } = await publicClient.simulateContract({
    address: KARAM_ADDRESS,
    abi: ABI,
    functionName: "connectSocial",
    args: [platformId, username],
    account,
  });
  return walletClient.writeContract(request);
}

export async function giveKarma(
  to: string,
  amount: number,
  reason: string
): Promise<Hash> {
  if (!walletClient) throw new Error("No injected wallet available.");
  const account = await ensureAccount();

  const { request } = await publicClient.simulateContract({
    address: KARAM_ADDRESS,
    abi: ABI,
    functionName: "giveKarma",
    args: [getAddress(to), BigInt(amount), reason],
    account,
  });
  return walletClient.writeContract(request);
}

export async function slashKarma(to: string, amount: number): Promise<Hash> {
  if (!walletClient) throw new Error("No injected wallet available.");
  const account = await ensureAccount();

  const { request } = await publicClient.simulateContract({
    address: KARAM_ADDRESS,
    abi: ABI,
    functionName: "slashKarma",
    args: [getAddress(to), BigInt(amount)],
    account,
  });
  return walletClient.writeContract(request);
}

/* ----------------------------- EVENTS -------------------------------- */
export function watchKaramEvents(handlers: {
  onGave?: (e: {
    from: Address;
    to: Address;
    amount: number;
    reason: string;
    txHash: Hash;
    logIndex: number;
  }) => void;
  onSlashed?: (e: {
    from: Address;
    to: Address;
    amount: number;
    selfTax: number;
    txHash: Hash;
    logIndex: number;
  }) => void;
  onRegistered?: (e: {
    user: Address;
    startKarma: number;
    txHash: Hash;
    logIndex: number;
  }) => void;
  onSocialConnected?: (e: {
    user: Address;
    platform: number;
    username: string;
    bonus: number;
    txHash: Hash;
    logIndex: number;
  }) => void;
}) {
  const unsubs: Array<() => void> = [];

  unsubs.push(
    publicClient.watchContractEvent({
      address: KARAM_ADDRESS,
      abi: ABI,
      eventName: "Gave",
      onLogs: (logs) => {
        for (const l of logs) {
          const a = (l as any).args as {
            from: Address;
            to: Address;
            amount: bigint;
            reason: string;
          };
          handlers.onGave?.({
            from: a.from,
            to: a.to,
            amount: Number(a.amount),
            reason: a.reason ?? "",
            txHash: l.transactionHash!,
            logIndex: Number(l.logIndex ?? 0),
          });
        }
      },
    })
  );

  unsubs.push(
    publicClient.watchContractEvent({
      address: KARAM_ADDRESS,
      abi: ABI,
      eventName: "Slashed",
      onLogs: (logs) => {
        for (const l of logs) {
          const a = (l as any).args as {
            from: Address;
            to: Address;
            amount: bigint;
            selfTax: bigint;
          };
          handlers.onSlashed?.({
            from: a.from,
            to: a.to,
            amount: Number(a.amount),
            selfTax: Number(a.selfTax),
            txHash: l.transactionHash!,
            logIndex: Number(l.logIndex ?? 0),
          });
        }
      },
    })
  );

  unsubs.push(
    publicClient.watchContractEvent({
      address: KARAM_ADDRESS,
      abi: ABI,
      eventName: "Registered",
      onLogs: (logs) => {
        for (const l of logs) {
          const a = (l as any).args as { user: Address; startKarma: bigint };
          handlers.onRegistered?.({
            user: a.user,
            startKarma: Number(a.startKarma),
            txHash: l.transactionHash!,
            logIndex: Number(l.logIndex ?? 0),
          });
        }
      },
    })
  );

  unsubs.push(
    publicClient.watchContractEvent({
      address: KARAM_ADDRESS,
      abi: ABI,
      eventName: "SocialConnected",
      onLogs: (logs) => {
        for (const l of logs) {
          const a = (l as any).args as {
            user: Address;
            platform: bigint;
            username: string;
            bonus: bigint;
          };
          handlers.onSocialConnected?.({
            user: a.user,
            platform: Number(a.platform),
            username: a.username ?? "",
            bonus: Number(a.bonus),
            txHash: l.transactionHash!,
            logIndex: Number(l.logIndex ?? 0),
          });
        }
      },
    })
  );

  return () => unsubs.forEach((u) => u());
}
