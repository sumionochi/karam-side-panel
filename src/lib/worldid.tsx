// src/lib/worldid.tsx
import { IDKitWidget, type ISuccessResult, type VerificationLevel } from '@worldcoin/idkit';
import type { Root } from 'react-dom/client';

export type WorldIDOptions = {
  /** Must start with "app_"; matches IDKit's template literal type */
  appId: `app_${string}`;
  /** Action slug from Developer Portal */
  action: string;
  /** Optional signal (e.g., user's wallet address) */
  signal?: string;
  /** e.g., VerificationLevel.Orb */
  verificationLevel?: VerificationLevel;
  /** Your backend endpoint, e.g. `${import.meta.env.VITE_API_BASE}/worldid/verify` */
  verifyEndpoint: string;
  /** Send cookies to your API? (only if you use them) */
  includeCredentials?: boolean;
};

export async function verifyWithWorldID(
  opts: WorldIDOptions
): Promise<{ isVerified: boolean; payload?: ISuccessResult }> {
  const { appId, action, signal, verificationLevel, verifyEndpoint, includeCredentials = true } = opts;

  // Imperatively mount the widget in a temporary container
  const host = document.createElement('div');
  document.body.appendChild(host);

  return await new Promise((resolve) => {
    let root: Root | null = null;

    const unmount = () => {
      try {
        root?.unmount();
      } catch {}
      host.remove();
    };

    // Per docs, handleVerify must THROW on failure; returning boolean is invalid.
    // If this throws, IDKit shows the error in the modal. :contentReference[oaicite:1]{index=1}
    const handleVerify = async (res: ISuccessResult): Promise<void> => {
      const r = await fetch(verifyEndpoint, {
        method: 'POST',
        credentials: includeCredentials ? 'include' : 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...res, signal }),
      });
      if (!r.ok) {
        let msg = 'Verification failed.';
        try {
          const data = await r.json();
          msg = data?.error || data?.detail || msg;
        } catch {
          /* ignore JSON parse */
        }
        throw new Error(msg);
      }
    };

    const onSuccess = (res: ISuccessResult) => {
      resolve({ isVerified: true, payload: res });
      unmount();
    };

    const onError = () => {
      resolve({ isVerified: false });
      unmount();
    };

    // Lazy import React 18 root to keep this helper self-contained
    import('react-dom/client').then(({ createRoot }) => {
      root = createRoot(host);
      root.render(
        <IDKitWidget
          app_id={appId}
          action={action}
          signal={signal}
          verification_level={verificationLevel}
          handleVerify={handleVerify}
          onSuccess={onSuccess}
          onError={onError}
        >
          {({ open }) => {
            // Auto-open the modal
            setTimeout(open, 0);
            return null;
          }}
        </IDKitWidget>
      );
    });
  });
}
