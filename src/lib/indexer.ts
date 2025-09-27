// src/lib/indexer.ts
import type {
  User,
  KarmaTransaction,
  LeaderboardEntry,
  KarmaTimestamp,
  SocialPlatform,
} from "@/types/karma";

/* ───────────────────────────── env ───────────────────────────── */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(
  /\/+$/,
  ""
);
const EXPLORER_BASE = (
  import.meta.env.VITE_EXPLORER_BASE as string | undefined
)?.replace(/\/+$/, "");

/* ───────────────────────────── api types ───────────────────────────── */
interface ApiUsage {
  totalGivenToday?: number | string;
  totalSlashedToday?: number | string;
}

interface ApiUser {
  id?: string;
  address?: string;
  addr?: string;
  wallet?: string;

  karma?: number | string;
  balance?: number | string;

  ensName?: string;
  ens?: string;

  isVerified?: boolean;
  worldIdVerified?: boolean;

  socialProfiles?: Record<string, unknown>;
  social?: Record<string, unknown>;
  twitter?: string;
  github?: string;
  discord?: string;

  avatar?: string;
  bio?: string;

  stats?: {
    given?: number | string;
    received?: number | string;
  };

  totalGiven?: number | string;
  totalReceived?: number | string;

  usage?: ApiUsage;

  lastActivity?: KarmaTimestamp;
  latestEventTs?: KarmaTimestamp;
}

interface ApiHistoryResponse {
  items?: any[];
  list?: any[];
  nextCursor?: string;
  next?: string;
}

interface ApiLeaderboardRow {
  user?: ApiUser;
  rank?: number | string;
  change?: number | string;
}

interface ApiLeaderboardResponse {
  items?: ApiLeaderboardRow[] | ApiUser[];
  list?: ApiLeaderboardRow[] | ApiUser[];
}

/* ───────────────────────────── utilities ───────────────────────────── */
const toMs = (t?: KarmaTimestamp): number | undefined => {
  if (t == null) return undefined;
  if (typeof t === "number") return t;
  if (t instanceof Date) return t.getTime();
  const parsed = Date.parse(t);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const ok = (r: Response) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
};

function randomId(): string {
  try {
    // @ts-ignore – not in lib.dom.d.ts in some TS configs
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function GET<T>(
  path: string,
  search?: Record<string, unknown>,
  timeoutMs = 12_000
): Promise<T> {
  if (!API_BASE) throw new Error("API_BASE not configured");
  const url = new URL(`${API_BASE}${path}`);
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      credentials: "include",
      signal: ac.signal,
    }).then(ok);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/* ───────────────────────────── mappers ───────────────────────────── */
function mapUser(raw: any): User {
  const address: string = String(
    raw?.address ?? raw?.addr ?? raw?.wallet ?? ""
  ).toLowerCase();

  const social = raw?.socialProfiles ?? raw?.social ?? {};
  const usage = (raw?.usage ?? {}) as ApiUsage;

  return {
    id: String(raw?.id ?? address ?? "").toLowerCase(),
    address,
    karma: Number(raw?.karma ?? raw?.balance ?? 0),
    ensName: raw?.ensName ?? raw?.ens ?? undefined,
    isVerified: Boolean(raw?.isVerified ?? raw?.worldIdVerified ?? false),
    socialProfiles: {
      twitter: social?.twitter ?? social?.x ?? raw?.twitter ?? undefined,
      github: social?.github ?? raw?.github ?? undefined,
      discord: social?.discord ?? raw?.discord ?? undefined,
      instagram: social?.instagram ?? undefined,
      tiktok: social?.tiktok ?? undefined,
      youtube: social?.youtube ?? undefined,
    },
    avatar: raw?.avatar ?? undefined,
    bio: raw?.bio ?? undefined,
    totalGiven: Number(raw?.totalGiven ?? raw?.stats?.given ?? 0),
    totalReceived: Number(raw?.totalReceived ?? raw?.stats?.received ?? 0),
    dailyGiveLimit: Number(raw?.dailyGiveLimit ?? 30),
    dailySlashLimit: Number(raw?.dailySlashLimit ?? 20),
    dailyGiveUsed: Number(usage?.totalGivenToday ?? 0),
    dailySlashUsed: Number(usage?.totalSlashedToday ?? 0),
    lastActivity: toMs(raw?.lastActivity ?? raw?.latestEventTs),
  };
}

function mapTx(raw: any): KarmaTransaction {
  const typeMap: Record<string, KarmaTransaction["type"]> = {
    give: "give",
    gave: "give",
    slash: "slash",
    slashed: "slash",
    registered: "registered",
    social_connected: "social_connected",
    social: "social_connected",
  };

  const tType = typeMap[String(raw?.type ?? "").toLowerCase()] ?? "give";
  const txHash: string | undefined = raw?.txHash ?? raw?.txid ?? raw?.hash;

  const id: string =
    raw?.id ?? (txHash ? `${txHash}:${raw?.logIndex ?? 0}` : randomId());

  return {
    id,
    from: String(raw?.from ?? raw?.src ?? raw?.sender ?? "").toLowerCase(),
    to: String(raw?.to ?? raw?.dst ?? raw?.receiver ?? "").toLowerCase(),
    amount: Number(raw?.amount ?? 0),
    type: tType,
    timestamp: toMs(raw?.timestamp ?? raw?.ts),
    txHash,
    reason: raw?.reason ?? undefined,
    tax: raw?.selfTax != null ? Number(raw.selfTax) : undefined,
    platform: raw?.platform as SocialPlatform | undefined,
    username: raw?.username ?? undefined,
  };
}

function mapLeaderboard(rawList: any[]): LeaderboardEntry[] {
  return (rawList ?? []).map((row: any, i: number) => ({
    user: mapUser(row?.user ?? row),
    rank: Number(row?.rank ?? i + 1),
    change: Number(row?.change ?? 0),
  }));
}

/* ───────────────────────────── API surface ───────────────────────────── */
export async function fetchSelfProfile(): Promise<User> {
  const data = await GET<ApiUser>("/profiles/me");
  return mapUser(data);
}

export async function fetchProfileByAddress(
  address: string
): Promise<User | null> {
  try {
    const data = await GET<ApiUser>(`/profiles/${address}`);
    return mapUser(data);
  } catch {
    return null;
  }
}

export async function fetchProfileByXHandle(
  handle: string
): Promise<User | null> {
  try {
    const h = handle.replace(/^@/, "");
    const data = await GET<ApiUser>(`/profiles/x/${h}`);
    return mapUser(data);
  } catch {
    return null;
  }
}

export async function fetchHistory(
  address: string,
  opts?: { limit?: number; cursor?: string }
): Promise<{ items: KarmaTransaction[]; nextCursor?: string }> {
  const data = await GET<ApiHistoryResponse>(`/history/${address}`, {
    limit: opts?.limit ?? 50,
    cursor: opts?.cursor,
  });

  const raw = (data.items ?? data.list ?? []) as any[];
  const items: KarmaTransaction[] = raw.map(mapTx);

  // stable sort by timestamp desc if backend not sorted
  items.sort((a, b) => (toMs(b.timestamp) ?? 0) - (toMs(a.timestamp) ?? 0));

  return {
    items,
    nextCursor: data.nextCursor ?? data.next ?? undefined,
  };
}

export async function fetchRecentTransactions(
  address: string,
  limit = 5
): Promise<KarmaTransaction[]> {
  const { items } = await fetchHistory(address, { limit });
  return items.slice(0, limit);
}

export async function fetchLeaderboard(
  limit = 50
): Promise<LeaderboardEntry[]> {
  const data = await GET<ApiLeaderboardResponse>("/leaderboard", { limit });
  const list = (data.items ?? data.list ?? []) as any[];
  return mapLeaderboard(list);
}

/** Optional: helper to build explorer links */
export function txLink(hash?: string): string | undefined {
  if (!hash || !EXPLORER_BASE) return undefined;
  return `${EXPLORER_BASE}/tx/${hash}`;
}
