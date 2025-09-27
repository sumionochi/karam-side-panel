import { z } from "zod";

/** IDKit widget success payload (subset; passthrough keeps forwards-compat) */
export const zIdKitSuccess = z
  .object({
    merkle_root: z.string(),
    nullifier_hash: z.string(),
    proof: z.string(),
    verification_level: z.string().optional(),
    credential_type: z.string().optional(),
    // you can add other known fields, but keep passthrough for future fields
  })
  .passthrough();

export type IdKitSuccess = z.infer<typeof zIdKitSuccess>;

export function env<T extends string = string>(key: string, fallback?: T): T {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env: ${key}`);
  return v as T;
}
