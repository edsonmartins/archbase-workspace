import React, { Suspense, Component, type ReactNode, useCallback, useMemo, useState } from 'react';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { registryQueries } from '@archbase/workspace-state';
import { createSecureSDK, WorkspaceProvider } from '@archbase/workspace-sdk';
import type { AppManifest } from '@archbase/workspace-types';
import { ShadowContainer } from './ShadowContainer';
import { SandboxedApp } from './SandboxedApp';
import { WasmApp } from './WasmApp';

interface RemoteAppProps {
  appId: string;
  windowId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  appName: string;
  onRetry: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="remote-app-error">
          <span className="remote-app-error-icon">!!!</span>
          <span>Failed to load {this.props.appName}</span>
          <button
            className="remote-app-retry-btn"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              this.props.onRetry();
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Cache loaded remote components by MF name
const remoteComponents: Record<string, React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>> = {};

function getRemoteComponent(mfName: string) {
  if (!remoteComponents[mfName]) {
    remoteComponents[mfName] = React.lazy(async () => {
      const module = await loadRemote<{ default: React.ComponentType<Record<string, unknown>> }>(`${mfName}/App`);
      if (!module) {
        throw new Error(`Failed to load remote app: ${mfName}`);
      }
      return module;
    });
  }
  return remoteComponents[mfName];
}

function clearRemoteCache(mfName: string) {
  delete remoteComponents[mfName];
}

export function RemoteApp({ appId, windowId }: RemoteAppProps) {
  const [retryCount, setRetryCount] = useState(0);

  // appId is the manifest id (e.g., 'dev.archbase.hello-world').
  // We look up the manifest to get the MF name (e.g., 'hello_world') for loadRemote().
  const manifest = registryQueries.getApp(appId);
  const mfName = manifest?.name ?? appId;
  const displayName = manifest?.displayName ?? mfName;
  const isWasm = !!manifest?.wasm;
  const isSandboxed = !!manifest?.sandbox;

  // Always use createSecureSDK — even without a manifest, use a deny-all fallback
  // to prevent permission bypass when registry lookup fails
  const fallbackManifest: AppManifest = useMemo(() => ({
    id: appId,
    name: mfName,
    version: '0.0.0',
    entrypoint: '',
    remoteEntry: '',
    permissions: [], // No permissions → all guarded services blocked
  }), [appId, mfName]);

  const sdk = useMemo(
    () => createSecureSDK(appId, windowId, manifest ?? fallbackManifest),
    [appId, windowId, manifest, fallbackManifest],
  );

  const handleRetry = useCallback(() => {
    clearRemoteCache(mfName);
    setRetryCount((c) => c + 1);
  }, [mfName]);

  // WASM mode: WebAssembly rendering path
  if (isWasm && manifest) {
    return <WasmApp appId={appId} windowId={windowId} manifest={manifest} />;
  }

  // Sandboxed iframe mode: completely different rendering path
  if (isSandboxed && manifest) {
    return <SandboxedApp appId={appId} windowId={windowId} manifest={manifest} />;
  }

  const useShadow = manifest?.isolation?.css === 'shadow' || manifest?.isolation?.css === true;
  const RemoteComponent = getRemoteComponent(mfName);

  const content = (
    <Suspense fallback={<div className="remote-app-loading">Loading {displayName}...</div>}>
      <RemoteComponent windowId={windowId} />
    </Suspense>
  );

  return (
    <WorkspaceProvider value={sdk}>
      <ErrorBoundary key={retryCount} appName={displayName} onRetry={handleRetry}>
        {useShadow ? <ShadowContainer>{content}</ShadowContainer> : content}
      </ErrorBoundary>
    </WorkspaceProvider>
  );
}
