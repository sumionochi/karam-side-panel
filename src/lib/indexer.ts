// src/lib/indexer.ts
import type {
  User,
  KarmaTransaction,
  LeaderboardEntry,
  KarmaTimestamp,
  SocialPlatform,
  CONTRACT_LIMITS,
} from "@/types/karma";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(
  /\/+$/,
  ""
);
const EXPLORER_BASE = (
  import.meta.env.VITE_EXPLORER_BASE as string | undefined
)?.replace(/\/+$/, "");

if (!API_BASE) {
  // Pages will show toasts if calls fail; keeping build green.
  // console.warn('VITE_API_BASE not set; indexer calls will fail.');
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

async function GET<T>(path: string, search?: Record<string, any>): Promise<T> {
  if (!API_BASE) throw new Error("API_BASE not configured");
  const url = new URL(`${API_BASE}${path}`);
  if (search) {
    Object.entries(search).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), { credentials: "include" }).then(ok);
  return res.json() as Promise<T>;
}

/* ───────────────────────────── mappers ───────────────────────────── */
function mapUser(raw: any): User {
  // Accept multiple shapes; normalize to our UI model
  const address: string = raw.address ?? raw.addr ?? raw.wallet ?? "";
  const karma: number = Number(raw.karma ?? raw.balance ?? 0);
  const social = raw.socialProfiles ?? raw.social ?? {};
  const usage = raw.usage ?? {};

  return {
    id: (raw.id ?? address ?? "").toLowerCase(),
    address: address.toLowerCase(),
    karma,
    ensName: raw.ensName ?? raw.ens ?? undefined,
    isVerified: Boolean(raw.isVerified ?? raw.worldIdVerified ?? false),
    socialProfiles: {
      twitter: social.twitter ?? social.x ?? raw.twitter ?? undefined,
      github: social.github ?? raw.github ?? undefined,
      discord: social.discord ?? raw.discord ?? undefined,
      instagram: social.instagram ?? undefined,
      tiktok: social.tiktok ?? undefined,
      youtube: social.youtube ?? undefined,
    },
    avatar: raw.avatar ?? undefined,
    bio: raw.bio ?? undefined,
    totalGiven: Number(raw.totalGiven ?? raw.stats?.given ?? 0),
    totalReceived: Number(raw.totalReceived ?? raw.stats?.received ?? 0),
    dailyGiveLimit: Number(raw.dailyGiveLimit ?? 30),
    dailySlashLimit: Number(raw.dailySlashLimit ?? 20),
    dailyGiveUsed: Number(usage.totalGivenToday ?? 0),
    dailySlashUsed: Number(usage.totalSlashedToday ?? 0),
    lastActivity: toMs(raw.lastActivity ?? raw.latestEventTs),
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

  const tType = typeMap[(raw.type ?? "").toLowerCase()] ?? "give";
  const txHash: string | undefined = raw.txHash ?? raw.txid ?? raw.hash;
  const id =
    raw.id ?? (txHash ? `${txHash}:${raw.logIndex ?? 0}` : crypto.randomUUID());

  return {
    id,
    from: (raw.from ?? raw.src ?? raw.sender ?? "").toLowerCase(),
    to: (raw.to ?? raw.dst ?? raw.receiver ?? "").toLowerCase(),
    amount: Number(raw.amount ?? 0),
    type: tType,
    timestamp: toMs(raw.timestamp ?? raw.ts),
    txHash,
    reason: raw.reason ?? undefined,
    tax: raw.selfTax != null ? Number(raw.selfTax) : undefined,
    platform: raw.platform as SocialPlatform | undefined,
    username: raw.username ?? undefined,
  };
}

function mapLeaderboard(rawList: any[]): LeaderboardEntry[] {
  return (rawList ?? []).map((row, i) => ({
    user: mapUser(row.user ?? row),
    rank: Number(row.rank ?? i + 1),
    change: Number(row.change ?? 0),
  }));
}

/* ───────────────────────────── API surface ───────────────────────────── */
export async function fetchSelfProfile(): Promise<User> {
  const data = await GET<any>("/profiles/me");
  return mapUser(data);
}

export async function fetchProfileByAddress(
  address: string
): Promise<User | null> {
  try {
    const data = await GET<any>(`/profiles/${address}`);
    return mapUser(data);
  } catch {
    return null;
  }
}

export async function fetchProfileByXHandle(
  handle: string
): Promise<User | null> {
  try {
    const data = await GET<any>(`/profiles/x/${handle.replace(/^@/, "")}`);
    return mapUser(data);
  } catch {
    return null;
  }
}

export async function fetchHistory(
  address: string,
  opts?: { limit?: number; cursor?: string }
) {
  const data = await GET<any>(`/history/${address}`, {
    limit: opts?.limit ?? 50,
    cursor: opts?.cursor,
  });
  const items: KarmaTransaction[] = (data.items ?? data.list ?? data).map(
    mapTx
  );
  // stable sort by timestamp desc if backend not sorted
  items.sort((a, b) => (toMs(b.timestamp) ?? 0) - (toMs(a.timestamp) ?? 0));
  return {
    items,
    nextCursor: data.nextCursor ?? data.next ?? undefined,
  };
}

export async function fetchRecentTransactions(address: string, limit = 5) {
  const { items } = await fetchHistory(address, { limit });
  return items.slice(0, limit);
}

export async function fetchLeaderboard(
  limit = 50
): Promise<LeaderboardEntry[]> {
  const data = await GET<any>("/leaderboard", { limit });
  return mapLeaderboard(data.items ?? data.list ?? data);
}

/** Optional: helper to build explorer links */
export function txLink(hash?: string): string | undefined {
  if (!hash || !EXPLORER_BASE) return undefined;
  return `${EXPLORER_BASE}/tx/${hash}`;
}
