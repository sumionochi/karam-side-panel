// src/lib/contracts.ts
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  getAddress,
  type Address,
  type Hash,
} from "viem";
import type { DailyUsage, PerRecipientUsage } from "@/types/karma"; // keep if you still use types
// ↑ You won't have live reads for DailyUsage/PerRecipientUsage with this ABI; keep for UI typing if needed.

// ───────────────────────── ENV
const RPC_URL = import.meta.env.VITE_RPC_URL as string;
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 4801);
const KARAM_ADDRESS = import.meta.env.VITE_KARAM_ADDRESS as `0x${string}`;

// ───────────────────────── Chain & Clients (World Chain Sepolia: 4801)
const chain = defineChain({
  id: CHAIN_ID,
  name: "World Chain Sepolia",
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
  } catch {}
  await (window as any).ethereum?.request?.({ method: "eth_requestAccounts" });
  const addrs = await walletClient.getAddresses();
  if (!addrs?.length) throw new Error("Wallet has no accounts.");
  return addrs[0]!;
}

// ───────────────────────── ABI (from your deployed contract)
export const KARAM_ABI = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "allUsers",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "connectSocial",
    inputs: [
      { name: "_whichPlatform", type: "uint256", internalType: "uint256" },
      { name: "_username", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "dailyReset",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "giveKarma",
    inputs: [
      { name: "_receiver", type: "address", internalType: "address" },
      { name: "_amount", type: "uint256", internalType: "uint256" },
      { name: "_reason", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isRegistered",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "karma",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redistibuteKarma",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "register",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "slashKarma",
    inputs: [
      { name: "_receiver", type: "address", internalType: "address" },
      { name: "_amount", type: "uint256", internalType: "uint256" },
      { name: "_reason", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "socialConnections",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [
      { name: "twitterUsername", type: "string", internalType: "string" },
      { name: "githubUsername", type: "string", internalType: "string" },
      { name: "discordUsername", type: "string", internalType: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "KarmaGiven",
    inputs: [
      { name: "from", type: "address", indexed: true, internalType: "address" },
      { name: "to", type: "address", indexed: true, internalType: "address" },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "reason",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "KarmaSlashed",
    inputs: [
      {
        name: "slasher",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "victim",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "reason",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "AlreadyRegistered", inputs: [] },
  { type: "error", name: "LimitExceeded", inputs: [] },
  { type: "error", name: "NotEnoughKarma", inputs: [] },
  { type: "error", name: "NotOwner", inputs: [] },
] as const;

const CONTRACT = { address: KARAM_ADDRESS, abi: KARAM_ABI } as const;

// ───────────────────────── READS
export async function getKarma(addr: string): Promise<number> {
  const out = await publicClient.readContract({
    ...CONTRACT,
    functionName: "karma",
    args: [getAddress(addr)],
    authorizationList: undefined,
  });
  return Number(out as bigint);
}

export async function getSocialConnections(addr: string): Promise<{
  twitterUsername: string;
  githubUsername: string;
  discordUsername: string;
}> {
  const res = await publicClient.readContract({
    ...CONTRACT,
    functionName: "socialConnections",
    args: [getAddress(addr)],
    authorizationList: undefined,
  });
  const [tw, gh, dc] = res as readonly [string, string, string];
  return { twitterUsername: tw, githubUsername: gh, discordUsername: dc };
}

export async function isRegistered(addr: string): Promise<boolean> {
  const out = await publicClient.readContract({
    ...CONTRACT,
    functionName: "isRegistered",
    args: [getAddress(addr)],
    authorizationList: undefined,
  });
  return Boolean(out as boolean);
}

// ───────────────────────── WRITES
async function ensureSigner(): Promise<Address> {
  if (!walletClient) throw new Error("No injected wallet available.");
  return ensureAccount();
}

export async function register(): Promise<Hash> {
  const account = await ensureSigner();
  const { request } = await publicClient.simulateContract({
    ...CONTRACT,
    functionName: "register",
    account,
  });
  return walletClient!.writeContract(request);
}

export async function connectSocial(
  platformId: number | bigint,
  username: string
): Promise<Hash> {
  const account = await ensureSigner();
  const { request } = await publicClient.simulateContract({
    ...CONTRACT,
    functionName: "connectSocial",
    args: [BigInt(platformId), username],
    account,
  });
  return walletClient!.writeContract(request);
}

export async function giveKarma(
  to: string,
  amount: number,
  reason: string
): Promise<Hash> {
  const account = await ensureSigner();
  const { request } = await publicClient.simulateContract({
    ...CONTRACT,
    functionName: "giveKarma",
    args: [getAddress(to), BigInt(amount), reason],
    account,
  });
  return walletClient!.writeContract(request);
}

export async function slashKarma(
  to: string,
  amount: number,
  reason: string
): Promise<Hash> {
  const account = await ensureSigner();
  const { request } = await publicClient.simulateContract({
    ...CONTRACT,
    functionName: "slashKarma",
    args: [getAddress(to), BigInt(amount), reason],
    account,
  });
  return walletClient!.writeContract(request);
}

// Optional admin: spelling matches your ABI ("redistibuteKarma")
export async function redistibuteKarma(): Promise<Hash> {
  const account = await ensureSigner();
  const { request } = await publicClient.simulateContract({
    ...CONTRACT,
    functionName: "redistibuteKarma",
    account,
  });
  return walletClient!.writeContract(request);
}

// ───────────────────────── EVENTS
export function watchKaramEvents(handlers: {
  onKarmaGiven?: (e: {
    from: Address;
    to: Address;
    amount: number;
    reason: string;
    timestamp: number;
    txHash: Hash;
    logIndex: number;
  }) => void;
  onKarmaSlashed?: (e: {
    slasher: Address;
    victim: Address;
    amount: number;
    reason: string;
    timestamp: number;
    txHash: Hash;
    logIndex: number;
  }) => void;
}) {
  const unsubs: Array<() => void> = [];

  unsubs.push(
    publicClient.watchContractEvent({
      ...CONTRACT,
      eventName: "KarmaGiven",
      onLogs: (logs) => {
        for (const l of logs) {
          const a = (l as any).args as {
            from: Address;
            to: Address;
            amount: bigint;
            reason: string;
            timestamp: bigint;
          };
          handlers.onKarmaGiven?.({
            from: a.from,
            to: a.to,
            amount: Number(a.amount),
            reason: a.reason ?? "",
            timestamp: Number(a.timestamp),
            txHash: l.transactionHash!,
            logIndex: Number(l.logIndex ?? 0),
          });
        }
      },
    })
  );

  unsubs.push(
    publicClient.watchContractEvent({
      ...CONTRACT,
      eventName: "KarmaSlashed",
      onLogs: (logs) => {
        for (const l of logs) {
          const a = (l as any).args as {
            slasher: Address;
            victim: Address;
            amount: bigint;
            reason: string;
            timestamp: bigint;
          };
          handlers.onKarmaSlashed?.({
            slasher: a.slasher,
            victim: a.victim,
            amount: Number(a.amount),
            reason: a.reason ?? "",
            timestamp: Number(a.timestamp),
            txHash: l.transactionHash!,
            logIndex: Number(l.logIndex ?? 0),
          });
        }
      },
    })
  );

  return () => unsubs.forEach((u) => u());
}
