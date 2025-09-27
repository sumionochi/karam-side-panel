import { Router, type Request, type Response } from "express";
import { hashToField } from "@worldcoin/idkit-core/hashing";
import { env, zIdKitSuccess, type IdKitSuccess } from "../lib/validate.js";
import { z } from "zod";

// Try to import server helper for Cloud verification.
// Prefer backend helper; fall back to core; else use REST.
let verifyCloudProof:
  | ((
      proof: {
        merkle_root: string;
        nullifier_hash: string;
        proof: string;
        verification_level?: string;
      },
      app_id: string,
      action: string,
      signal?: string
    ) => Promise<{
      success: boolean;
      code?: string;
      attribute?: string | null;
      detail?: string;
    }>)
  | undefined;

try {
  const mod = await import("@worldcoin/idkit-core/backend");
  // @ts-expect-error runtime shape
  verifyCloudProof = mod.verifyCloudProof;
} catch {
  try {
    const mod = await import("@worldcoin/idkit-core");
    // @ts-expect-error runtime shape
    verifyCloudProof = mod.verifyCloudProof;
  } catch {
    // Will use REST fallback below
  }
}

const router = Router();

type VerifyReq = Request<unknown, unknown, IdKitSuccess & { signal?: string }>;
type VerifyRes = Response<{ success: boolean; world?: any; error?: string }>;

router.post("/verify", async (req: VerifyReq, res: VerifyRes) => {
  try {
    const body = zIdKitSuccess
      .extend({ signal: z.string().optional() })
      .parse(req.body);

    const app_id = env("WORLD_APP_ID");
    const action = env("WORLD_ACTION_ID");

    const basePayload = {
      merkle_root: body.merkle_root,
      nullifier_hash: body.nullifier_hash,
      proof: body.proof,
      verification_level: body.verification_level,
    };

    if (verifyCloudProof) {
      // ✅ Library helper: pass raw `signal` string; helper handles hashing internally.
      const result = await verifyCloudProof(
        basePayload,
        app_id,
        action,
        body.signal
      );
      if (result.success) return res.json({ success: true, world: result });
      return res.status(400).json({ success: false, world: result });
    }

    // 🔁 REST fallback (v2): if you used a signal, send its keccak→field as 0x hex.
    const signalHashHex =
      body.signal !== undefined
        ? "0x" + (hashToField(body.signal) as unknown as bigint).toString(16)
        : undefined;

    const r = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${app_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "karam-sidepanel",
        },
        body: JSON.stringify({
          ...basePayload,
          action,
          signal_hash: signalHashHex, // optional if no signal used
        }),
      }
    );

    const data = await r.json();
    if (r.ok && data?.success) return res.json({ success: true, world: data });
    return res.status(400).json({ success: false, world: data });
  } catch (e: any) {
    console.error("[worldid] verify error:", e);
    return res
      .status(400)
      .json({ success: false, error: e?.message ?? "invalid_payload" });
  }
});

export default router;
