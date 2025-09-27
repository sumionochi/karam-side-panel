// src/lib/ens.ts
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";

/**
 * Use a mainnet RPC with ENS support.
 * Configure in .env: VITE_ENS_RPC_URL="https://<your-mainnet-rpc>"
 * Falls back to Cloudflare if not set.
 */
const ENS_RPC =
  (import.meta.env.VITE_ENS_RPC_URL as string | undefined) ??
  "https://cloudflare-eth.com";

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(ENS_RPC),
});

/** Resolve an ENS name (e.g. "vitalik.eth") to an address. */
export async function resolveName(name: string): Promise<Address | null> {
  try {
    const addr = await ensClient.getEnsAddress({ name });
    return (addr ?? null) as Address | null;
  } catch {
    return null;
  }
}

/** Reverse lookup: address → ENS name (if set). */
export async function reverseLookup(address: Address): Promise<string | null> {
  try {
    const name = await ensClient.getEnsName({ address });
    return name ?? null;
  } catch {
    return null;
  }
}
