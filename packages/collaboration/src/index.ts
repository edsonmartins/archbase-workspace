// Client
export { CollaborationClient } from './CollaborationClient';
export type { CollaborationClientOptions, CollaborationStateEvent } from './CollaborationClient';

// Transports
export { AbstractTransport } from './transports/Transport';
export { WebSocketTransport } from './transports/WebSocketTransport';
export { WebRTCTransport } from './transports/WebRTCTransport';

// Services
export { CursorService } from './services/CursorService';
export type { CursorServiceOptions } from './services/CursorService';
export { PresenceService } from './services/PresenceService';
export type { PresenceServiceOptions } from './services/PresenceService';
export { WindowSyncService } from './services/WindowSyncService';
export type { YWindowData, WindowSyncCallbacks } from './services/WindowSyncService';
export { FollowService } from './services/FollowService';
export type { FollowServiceCallbacks } from './services/FollowService';

// Utils
export { encodeMessage, decodeMessage } from './utils/encoding';
export { resolveUser, pickColor, CURSOR_PALETTE } from './utils/userDefaults';
