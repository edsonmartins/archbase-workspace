import type { WorkspaceSDK } from '@archbase/workspace-types';
import { useWorkspaceContext } from '../context/WorkspaceProvider';

/**
 * Get the full WorkspaceSDK instance.
 * Must be used within a <WorkspaceProvider>.
 */
export function useWorkspace(): WorkspaceSDK {
  const sdk = useWorkspaceContext();
  if (!sdk) {
    throw new Error('useWorkspace must be used within a <WorkspaceProvider>');
  }
  return sdk;
}
