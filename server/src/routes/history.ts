import { Router } from "express";

const router = Router();

router.get("/:address", (req, res) => {
  const { address } = req.params;
  const now = Date.now();

  const items = [
    {
      id: "tx1:0",
      type: "give",
      from: address.toLowerCase(),
      to: "0xabcabcabcabcabcabcabcabcabcabcabcabcab",
      amount: 5,
      timestamp: new Date(now - 60 * 60 * 1000).toISOString(),
      txHash: "0x111",
      reason: "helpful review",
    },
    {
      id: "tx2:0",
      type: "slash",
      from: address.toLowerCase(),
      to: "0xdefdefdefdefdefdefdefdefdefdefdefdefde",
      amount: 2,
      selfTax: 1,
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      txHash: "0x222",
    },
  ];

  res.json({ items, nextCursor: null });
});

export default router;
