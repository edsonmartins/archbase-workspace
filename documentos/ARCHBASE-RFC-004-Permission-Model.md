# RFC-004: App Permission Model

**Status**: Implemented

**Author**: Edson (CTO/Founder)

**Date**: 2025-02-15

---

## Summary

Apps declare required permissions in their manifest. Permissions are checked at runtime via `createSecureSDK`, which wraps SDK service calls with permission guards. When a permission has not been decided, a `PermissionPrompt` dialog is shown to the user. Grants are persisted in localStorage and survive browser sessions.

---

## Motivation

In a multi-app workspace where third-party apps run alongside trusted first-party apps, unrestricted access to system capabilities creates security and privacy risks:

1. **Notification spam** — A poorly-written app could flood the user with toasts
2. **Data exfiltration** — An app could read other apps' storage or clipboard contents
3. **Resource abuse** — An app could consume camera/microphone without the user's knowledge
4. **Collaboration hijack** — An app could join collaboration rooms and broadcast data without consent

The permission model provides a defense-in-depth layer that:
- Gives users explicit control over what each app can do
- Follows the principle of least privilege
- Mirrors familiar patterns from mobile OS (Android/iOS) and browser extensions (Chrome)

---

## Detailed Design

### Permission Types

10 permissions are defined, covering the key system capabilities:

```typescript
// packages/types/src/index.ts
export type Permission =
  | 'notifications'
  | 'storage'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'filesystem.read'
  | 'filesystem.write'
  | 'network'
  | 'camera'
  | 'microphone'
  | 'collaboration';
```

| Permission | Gates | Currently Enforced |
|---|---|---|
| `notifications` | `sdk.notifications.*` (info, success, warning, error, dismiss) | Yes |
| `storage` | `sdk.storage.*` (get, set, remove, clear, keys) | Yes |
| `clipboard.read` | Reading from clipboard | Future |
| `clipboard.write` | Writing to clipboard | Future |
| `filesystem.read` | Reading virtual filesystem | Future |
| `filesystem.write` | Writing virtual filesystem | Future |
| `network` | Outbound network requests | Future |
| `camera` | Camera access | Future |
| `microphone` | Microphone access | Future |
| `collaboration` | `sdk.collaboration.*` (join, leave, share, follow) | Yes |

### Grant States

```typescript
export type PermissionGrant = 'granted' | 'denied' | 'prompt';
```

| State | Meaning |
|---|---|
| `granted` | User has explicitly allowed this permission |
| `denied` | User has explicitly denied this permission |
| `prompt` | No decision has been made yet; the user will be prompted |

### Permission Flow

```
1. App calls sdk.notifications.info("Hello")
2. createSecureSDK intercepts the call
3. checkAndEnforce() checks usePermissionsStore:
   a. If 'granted' → allow the call, return result
   b. If 'denied' → block the call, return empty/noop
   c. If 'prompt' and NOT declared in manifest → deny silently (no persist)
   d. If 'prompt' and declared in manifest → block (app must call sdk.permissions.request() first)
4. App calls sdk.permissions.request('notifications'):
   a. usePermissionsStore.requestPermission() creates a PendingPrompt
   b. PermissionPrompt component renders the dialog
   c. User clicks "Allow" or "Deny"
   d. resolvePrompt() persists the decision and resolves the Promise
   e. App receives true (granted) or false (denied)
5. Subsequent calls to sdk.notifications.* use the persisted decision
```

### Manifest Declaration

Apps declare permissions they need in the manifest:

```json
{
  "id": "com.archbase.notes",
  "name": "notes",
  "permissions": ["notifications", "storage", "collaboration"]
}
```

**Important**: An app can only request permissions it has declared in its manifest. Requesting an undeclared permission silently returns `denied` without prompting the user. This prevents apps from escalating privileges at runtime.

### Secure SDK Wrapper

`createSecureSDK` wraps the base SDK with permission checks:

```typescript
// packages/sdk/src/createSecureSDK.ts
export function createSecureSDK(
  appId: string,
  windowId: string,
  manifest: AppManifest,
): WorkspaceSDK {
  const innerSDK = createWorkspaceSDK(appId, windowId);
  const declaredPermissions = new Set(manifest.permissions ?? []);

  return {
    // Pass-through (non-destructive, already scoped per-app):
    appId: innerSDK.appId,
    windowId: innerSDK.windowId,
    windows: innerSDK.windows,
    commands: innerSDK.commands,
    settings: innerSDK.settings,
    contextMenu: innerSDK.contextMenu,

    // Permission-guarded:
    notifications: wrapNotifications(innerSDK.notifications, appId, declaredPermissions),
    storage: wrapStorage(innerSDK.storage, appId, declaredPermissions),
    collaboration: wrapCollaboration(innerSDK.collaboration, appId, declaredPermissions),

    // Permission management:
    permissions: createPermissionsService(appId, manifest, declaredPermissions),
  };
}
```

**Currently enforced permissions:**
- `'notifications'` — wraps all `notifications.*` methods; returns empty string/noop if denied
- `'storage'` — wraps all `storage.*` methods; returns `null`/empty/noop if denied
- `'collaboration'` — wraps all `collaboration.*` methods; returns `false`/empty/noop if denied

**Pass-through services** (not gated):
- `windows` — window management is already scoped per-app
- `commands` — command registration is non-destructive
- `settings` — settings access is read-only for apps
- `contextMenu` — menu registration is non-destructive

### Permissions Service API

Each secure SDK instance includes a `permissions` service:

```typescript
sdk.permissions.check(permission: Permission): PermissionGrant;
sdk.permissions.request(permission: Permission): Promise<boolean>;
sdk.permissions.list(): Array<{ permission: Permission; grant: PermissionGrant }>;
```

- `check()` — Synchronous check of current grant state. Returns `'denied'` for undeclared permissions.
- `request()` — Async prompt flow. Returns `true` if granted, `false` if denied. For undeclared permissions, returns `false` without prompting.
- `list()` — Returns all 10 permissions with their current grant state for this app.

### Permission Store

```typescript
// packages/state/src/stores/permissions.ts
export const usePermissionsStore = create<PermissionsStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      grants: Map<string, Map<Permission, PermissionRecord>>,
      pendingPrompt: PendingPrompt | null,
      promptQueue: PendingPrompt[],

      checkPermission(appId, permission): PermissionGrant,
      grant(appId, permission): void,
      deny(appId, permission): void,
      getAppPermissions(appId): PermissionRecord[],
      resetApp(appId): void,
      resetAll(): void,
      requestPermission(appId, displayName, icon, permission): Promise<PermissionGrant>,
      resolvePrompt(grant: PermissionGrant): void,
    })),
  ),
);
```

Key features:
- **Sequential prompts** — Only one `PermissionPrompt` is shown at a time. Additional requests are queued in `promptQueue` and shown in order.
- **Deduplication** — If a prompt for the same app+permission is already pending/queued, subsequent requests subscribe to the existing prompt's resolution.
- **Timeout** — Duplicate listeners have a 60-second timeout to prevent indefinite leaks.
- **Atomic check-and-set** — The `requestPermission` action uses `set()` atomically to prevent race conditions between two synchronous permission requests.

### Storage Persistence

Grants are persisted in localStorage under the key `archbase:permissions`:

```json
{
  "com.archbase.notes": [
    { "permission": "notifications", "grant": "granted", "decidedAt": 1708000000000 },
    { "permission": "storage", "grant": "granted", "decidedAt": 1708000000000 }
  ],
  "com.archbase.calculator": [
    { "permission": "notifications", "grant": "denied", "decidedAt": 1708000001000 }
  ]
}
```

- Hydrated on store creation via `hydrateFromStorage()`
- Persisted after every `grant()` or `deny()` call via `persistToStorage()`
- Validated on hydration: invalid entries are silently skipped (corrupted data recovery)

### Permission Prompt UI

```typescript
// packages/core/src/components/PermissionPrompt.tsx
```

The `PermissionPrompt` component renders a modal dialog when `pendingPrompt` is non-null:
- Shows the app name, icon, and requested permission
- "Allow" button calls `resolvePrompt('granted')`
- "Deny" button calls `resolvePrompt('denied')`
- Accessible with ARIA attributes and focus management

### Reset Capabilities

- `resetApp(appId)` — Clears all grants for a specific app. Resolves any pending/queued prompts for that app as `'denied'`.
- `resetAll()` — Clears all grants for all apps. Resolves all pending/queued prompts as `'denied'`.

These are intended for use by the Settings app, allowing users to revoke permissions.

---

## Implementation

**Reference files:**
- `packages/types/src/index.ts` — `Permission`, `PermissionGrant`, `PermissionRecord` types
- `packages/state/src/stores/permissions.ts` — `usePermissionsStore`, `ALL_PERMISSIONS`
- `packages/sdk/src/createSecureSDK.ts` — `createSecureSDK()`, permission wrappers
- `packages/core/src/components/PermissionPrompt.tsx` — Permission prompt UI

### Design Decisions

1. **No TTL on grants** — Once granted or denied, a permission persists indefinitely until explicitly reset. The `decidedAt` timestamp is stored for a future TTL mechanism if needed.
2. **Module-scoped `idCounter`** — Prompt IDs are generated via a simple counter, never reset. IDs only need to be unique within a session.
3. **Undeclared permissions silently denied** — Apps cannot request permissions not in their manifest. This prevents privilege escalation and avoids confusing the user with prompts for permissions the app author did not intend.
4. **`resolvePrompt` normalizes grants** — Only `'granted'` and `'denied'` are accepted; any other value (including `'prompt'`) is treated as `'denied'`.

---

## Future Extensions

1. **TTL/expiry** — Auto-expire grants after a configurable period by checking `decidedAt` in `checkPermission()`
2. **Enforce remaining permissions** — Add guards for `clipboard.*`, `filesystem.*`, `network`, `camera`, `microphone`
3. **Permission groups** — Allow bundled permission requests (e.g., "Allow Notes to access storage and notifications?")
4. **Admin override** — Workspace administrators can pre-grant or pre-deny permissions for all apps
5. **Audit log** — Log permission checks and grants for security auditing

---

**Last Updated**: 2026-02-17
