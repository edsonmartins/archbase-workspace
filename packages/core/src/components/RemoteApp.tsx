import React, { Suspense, Component, type ReactNode, useCallback, useState } from 'react';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { registryQueries } from '@archbase/workspace-state';

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

// Cache loaded remote components
const remoteComponents: Record<string, React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>> = {};

function getRemoteComponent(appId: string) {
  if (!remoteComponents[appId]) {
    remoteComponents[appId] = React.lazy(async () => {
      const module = await loadRemote<{ default: React.ComponentType<Record<string, unknown>> }>(`${appId}/App`);
      if (!module) {
        throw new Error(`Failed to load remote app: ${appId}`);
      }
      return module;
    });
  }
  return remoteComponents[appId];
}

function clearRemoteCache(appId: string) {
  delete remoteComponents[appId];
}

function getAppDisplayName(appId: string): string {
  const manifest = registryQueries.getAppByName(appId);
  return manifest?.displayName || manifest?.name || appId;
}

export function RemoteApp({ appId, windowId }: RemoteAppProps) {
  const [retryCount, setRetryCount] = useState(0);
  const appName = getAppDisplayName(appId);

  const handleRetry = useCallback(() => {
    clearRemoteCache(appId);
    setRetryCount((c) => c + 1);
  }, [appId]);

  const RemoteComponent = getRemoteComponent(appId);

  return (
    <ErrorBoundary key={retryCount} appName={appName} onRetry={handleRetry}>
      <Suspense fallback={<div className="remote-app-loading">Loading {appName}...</div>}>
        <RemoteComponent windowId={windowId} />
      </Suspense>
    </ErrorBoundary>
  );
}
