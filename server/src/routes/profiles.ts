import { Router } from "express";

const router = Router();

// Replace these mocks with your DB/indexer later.
const demoUser = (addr: string) => ({
  address: addr.toLowerCase(),
  ensName: "demo.karam.eth",
  karma: 512,
  isVerified: false,
  socialProfiles: { twitter: "awesamarth_" },
  stats: { given: 42, received: 69 },
  usage: { totalGivenToday: 3, totalSlashedToday: 1 },
  lastActivity: new Date().toISOString(),
});

router.get("/me", (_req, res) => {
  // TODO: auth/session → derive wallet
  return res.json(demoUser("0x000000000000000000000000000000000000dEaD"));
});

router.get("/:address", (req, res) => {
  const { address } = req.params;
  return res.json(demoUser(address));
});

router.get("/x/:handle", (req, res) => {
  const { handle } = req.params;
  // TODO: lookup address by linked Twitter handle
  return res.json(demoUser(`0x${handle.padEnd(40, "0")}`));
});

export default router;
