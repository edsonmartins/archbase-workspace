import React, { useRef, useEffect, useMemo } from 'react';
import type { AppManifest, SandboxConfig } from '@archbase/workspace-types';
import { createSecureSDK, createHostBridge } from '@archbase/workspace-sdk';

interface SandboxedAppProps {
  appId: string;
  windowId: string;
  manifest: AppManifest;
}

/** Permissions that negate the sandbox when combined with allow-scripts */
const DANGEROUS_PERMISSIONS = new Set([
  'allow-same-origin',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-top-navigation-to-custom-protocols',
]);

/** Only allow http: and https: schemes for iframe src */
function isAllowedIframeSrc(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Renders a sandboxed app inside an iframe with a postMessage bridge
 * that proxies SDK calls to the host.
 */
export function SandboxedApp({ appId, windowId, manifest }: SandboxedAppProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sdk = useMemo(
    () => createSecureSDK(appId, windowId, manifest),
    [appId, windowId, manifest],
  );

  const sandboxConfig = normalizeSandboxConfig(manifest.sandbox);
  const sandboxAttr = buildSandboxAttr(sandboxConfig);
  const origin = sandboxConfig?.origin ?? '*';
  const iframeSrc = sandboxConfig?.url;

  if (origin === '*') {
    console.warn(
      `[SandboxedApp] "${manifest.id}" has no sandbox.origin configured — defaulting to "*". ` +
      'This is insecure in production. Set manifest.sandbox.origin to the actual host origin.',
    );
  }

  // Bridge setup: must be called unconditionally (Rules of Hooks).
  // Guards inside the effect body handle the case where iframeSrc is missing.
  useEffect(() => {
    if (!iframeSrc) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const cleanup = createHostBridge({ sdk, iframe, origin });
    return cleanup;
  }, [sdk, origin, iframeSrc]);

  if (!iframeSrc) {
    return (
      <div className="remote-app-error">
        <span className="remote-app-error-icon">!!!</span>
        <span>Sandboxed app &quot;{manifest.displayName ?? manifest.name}&quot; requires a &quot;sandbox.url&quot; in its manifest.</span>
      </div>
    );
  }

  if (!isAllowedIframeSrc(iframeSrc)) {
    return (
      <div className="remote-app-error">
        <span className="remote-app-error-icon">!!!</span>
        <span>Sandboxed app &quot;{manifest.displayName ?? manifest.name}&quot; has an invalid sandbox URL. Only http: and https: are allowed.</span>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      sandbox={sandboxAttr}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
      }}
      title={manifest.displayName ?? manifest.name}
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────

function normalizeSandboxConfig(
  sandbox: boolean | SandboxConfig | undefined,
): SandboxConfig | undefined {
  if (!sandbox) return undefined;
  if (sandbox === true) return {};
  return sandbox;
}

function buildSandboxAttr(config: SandboxConfig | undefined): string {
  const permissions = new Set(['allow-scripts']);

  if (config?.allow) {
    for (const perm of config.allow) {
      // H5: Reject dangerous permissions that negate the sandbox
      if (DANGEROUS_PERMISSIONS.has(perm)) {
        console.warn(`[SandboxedApp] Ignoring dangerous sandbox permission: ${perm}`);
        continue;
      }
      permissions.add(perm);
    }
  }

  return Array.from(permissions).join(' ');
}
