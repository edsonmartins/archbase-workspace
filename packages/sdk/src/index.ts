// Core
export { createWorkspaceSDK } from './createSDK';
export { createSecureSDK } from './createSecureSDK';

// Context
export { WorkspaceProvider, WorkspaceContext } from './context/WorkspaceProvider';
export type { WorkspaceProviderProps } from './context/WorkspaceProvider';

// Hooks
export { useWorkspace } from './hooks/useWorkspace';
export { useWindowContext } from './hooks/useWindowContext';
export { useCommand } from './hooks/useCommand';
export { useSettingValue } from './hooks/useSetting';
export { useStorage } from './hooks/useStorage';

// Bridge (for sandboxed iframe apps)
export { createHostBridge } from './bridge/hostBridge';
export type { HostBridgeOptions } from './bridge/hostBridge';
export { createIframeBridgeSDK } from './bridge/iframeBridge';
export type { IframeBridgeSDK, IframeBridgeOptions } from './bridge/iframeBridge';
export { isBridgeMessage, BRIDGE_MARKER } from './bridge/types';
export type {
  BridgeRequest,
  BridgeResponse,
  BridgeError,
  BridgeEvent,
  BridgeMessage,
} from './bridge/types';

// Re-export types for convenience
export type { WorkspaceSDK } from '@archbase/workspace-types';
