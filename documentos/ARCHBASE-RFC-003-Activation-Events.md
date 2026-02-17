# RFC-003: App Activation Events

**Status**: Implemented

**Author**: Edson (CTO/Founder)

**Date**: 2025-02-15

---

## Summary

Apps declare activation events in their manifest. The `activationService` listens for these events and activates matching apps, enabling lazy-loading of Module Federation bundles. Only apps whose activation events have fired will have their remotes loaded, reducing initial startup time.

---

## Motivation

Without activation events, all registered apps would need to be loaded eagerly at desktop startup. In a workspace with 10-50+ apps, this would:

1. **Increase initial load time** — downloading and initializing all MF remote entries upfront
2. **Waste bandwidth** — loading apps the user may never open in a session
3. **Prevent background apps** — no mechanism for apps to respond to system events without being visible

The VS Code extension activation model provides a proven pattern: extensions declare when they should activate (e.g., `onLanguage:python`, `onCommand:myExtension.start`), and the host only loads them when those conditions are met.

---

## Detailed Design

### Activation Event Types

Apps declare activation events via the `activationEvents` array in their manifest:

```typescript
// packages/types/src/index.ts
export type ActivationEvent =
  | 'onDesktopReady'
  | `onCommand:${string}`
  | `onFileType:${string}`
  | `onShortcut:${string}`
  | `onSchedule:${string}`;
```

| Event Pattern | Trigger | Example |
|---|---|---|
| `onDesktopReady` | Desktop shell has finished initialization | App that should always be available |
| `onCommand:{id}` | A command with the given ID is executed | `onCommand:notes.newNote` |
| `onFileType:{ext}` | A file with the given extension is opened | `onFileType:md`, `onFileType:csv` |
| `onShortcut:{combo}` | A keyboard shortcut is pressed | `onShortcut:Ctrl+Shift+T` |
| `onSchedule:{cron}` | A cron-style schedule fires | `onSchedule:*/5 * * * *` (future) |

### Lifecycle Configuration

Apps can further control their lifecycle via the `lifecycle` field in the manifest:

```typescript
// packages/types/src/index.ts
export interface LifecycleConfig {
  singleton?: boolean;   // Prevent multiple windows of this app
  background?: boolean;  // Future: run without a visible window
  preload?: boolean;     // Prefetch MF bundle on activation (before user opens)
  autoStart?: boolean;   // Auto-open a window when activated
}
```

| Field | Default | Effect |
|---|---|---|
| `singleton` | `false` | If `true`, opening the app when a window already exists will focus the existing window instead of creating a new one |
| `autoStart` | `false` | If `true`, the app automatically opens a window when its activation event fires |
| `preload` | `false` | If `true`, the MF remote entry is fetched (but not rendered) when activated, so the bundle is cached |
| `background` | `false` | Reserved for future use: headless execution without a visible window |

### Manifest Example

```json
{
  "id": "com.archbase.notes",
  "name": "notes",
  "displayName": "Notes",
  "version": "1.0.0",
  "activationEvents": [
    "onDesktopReady",
    "onCommand:notes.newNote",
    "onFileType:md",
    "onFileType:txt"
  ],
  "lifecycle": {
    "singleton": true,
    "autoStart": false,
    "preload": true
  }
}
```

### ActivationService API

The `activationService` is a module-scoped singleton (not a Zustand store) that manages activation state:

```typescript
// packages/state/src/services/activationService.ts

export const activationService = {
  /** Initialize: build activation map, fire onDesktopReady, subscribe to new registrations */
  init(): void;

  /** Fire an activation event — any apps waiting for this event will be activated */
  fireEvent(event: ActivationEvent): void;

  /** Check if an app has been activated */
  isActivated(appId: string): boolean;

  /** Get list of app IDs that have not yet been activated */
  getPendingApps(): string[];

  /** Dispose all listeners and reset internal state */
  dispose(): void;
};
```

### Callback Handlers

To avoid circular dependencies between `@archbase/workspace-state` and `@archbase/workspace-core`, the activation service uses a callback pattern for lifecycle actions:

```typescript
// Cross-package decoupling
export function setPreloadHandler(fn: (manifest: AppManifest) => void): void;
export function setAutoStartHandler(fn: (manifest: AppManifest) => void): void;
```

The core package sets these handlers during initialization:

```typescript
// packages/core/src/hooks/useRegistryInit.ts
setPreloadHandler((manifest) => {
  // Prefetch the MF remote entry
  loadRemote(manifest.remoteEntry);
});

setAutoStartHandler((manifest) => {
  // Open a window for the app
  useWindowsStore.getState().openWindow({ appId: manifest.id, ... });
});
```

### Internal Architecture

```
1. Desktop shell boots
2. Manifests are registered via useAppRegistryStore.registerManifest()
3. activationService.init() is called:
   a. Builds activation map: Map<ActivationEvent, AppManifest[]>
   b. Fires 'onDesktopReady' — activates all apps with this event
   c. For activated apps with lifecycle.autoStart, calls autoStartHandler
   d. For activated apps with lifecycle.preload, calls preloadHandler
   e. Subscribes to onAppRegistered for late-registered apps
4. During runtime:
   a. User executes command → activationService.fireEvent('onCommand:notes.newNote')
   b. User opens file → activationService.fireEvent('onFileType:md')
   c. Newly activated apps get preloaded/auto-started per their lifecycle config
```

### State Management

The activation service maintains internal state without Zustand:

- `activatedApps: Set<string>` — IDs of apps that have been activated
- `pendingActivations: Map<string, AppManifest[]>` — event-to-manifests mapping
- `initialized: boolean` — prevents double initialization
- `preloadHandler` / `autoStartHandler` — injected callbacks

This design keeps the activation logic lightweight and avoids React re-renders for activation state changes, which are infrastructure-level concerns.

---

## Implementation

**Reference**: `packages/state/src/services/activationService.ts`

The implementation follows the design above. Key implementation details:

1. **Idempotent activation** — `activateApp()` checks `activatedApps.has(id)` before activating; calling `fireEvent` multiple times for the same event is safe
2. **Late registration** — Apps registered after `init()` are automatically added to the activation map; if they declare `onDesktopReady`, they are activated immediately
3. **Clean disposal** — `dispose()` unsubscribes all listeners, clears all maps and sets, and resets handlers to `null`

### Test Coverage

Tests validate:
- Activation on `onDesktopReady`
- Activation on `onCommand:*` events
- Activation on `onFileType:*` events
- Preload handler invocation for apps with `lifecycle.preload`
- AutoStart handler invocation for apps with `lifecycle.autoStart`
- Late-registered apps with `onDesktopReady` are activated immediately
- `isActivated()` and `getPendingApps()` correctness
- `dispose()` resets all state

---

## Future Extensions

1. **`onSchedule:{cron}`** — Timer-based activation for background tasks (e.g., periodic sync)
2. **`background` lifecycle** — Headless app execution without rendering a window
3. **Deactivation** — Allow apps to be deactivated (unloaded) when idle, freeing memory
4. **Activation event priorities** — Control activation order when multiple apps respond to the same event

---

**Last Updated**: 2026-02-17
