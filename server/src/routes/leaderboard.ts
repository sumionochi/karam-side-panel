import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  const base = "0x00000000000000000000000000000000000000";
  const users = Array.from({ length: 10 }).map((_, i) => ({
    user: {
      id: `${base}${i}`,
      address: `${base}${i}`,
      karma: 500 + (10 - i) * 7,
      ensName: i === 0 ? "god.karma.eth" : undefined,
      isVerified: i % 2 === 0,
      socialProfiles: { twitter: `user${i}` },
      avatar: undefined,
      bio: undefined,
      totalGiven: 100 + i * 3,
      totalReceived: 120 + i * 4,
      dailyGiveLimit: 30,
      dailySlashLimit: 20,
      dailyGiveUsed: i % 5,
      dailySlashUsed: i % 3,
      lastActivity: new Date().toISOString(),
    },
    rank: i + 1,
    change: i === 0 ? 1 : i % 3 === 0 ? -1 : 0,
  }));

  res.json({ items: users });
});

export default router;
