import { useMemo } from 'react';
import { useFocusedWindowId } from '@archbase/workspace-state';
import { useWorkspace } from './useWorkspace';

/**
 * Get window-specific utilities for the current window.
 * Must be used within a <WorkspaceProvider>.
 */
export function useWindowContext() {
  const sdk = useWorkspace();
  const focusedId = useFocusedWindowId();
  const isFocused = focusedId === sdk.windowId;

  return useMemo(
    () => ({
      windowId: sdk.windowId,
      close: () => sdk.windows.close(),
      minimize: () => sdk.windows.minimize(),
      maximize: () => sdk.windows.maximize(),
      restore: () => sdk.windows.restore(),
      setTitle: (title: string) => sdk.windows.setTitle(title),
      isFocused,
    }),
    [sdk, isFocused],
  );
}
