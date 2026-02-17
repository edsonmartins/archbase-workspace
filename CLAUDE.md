# Archbase Workspace - Project Instructions

## What is this project?
A multi-app workspace that unifies web systems from different frameworks (React, Angular, Vue, Svelte) into a professional interface with window management, powered by Module Federation 2.0.

## Tech Stack
- **Build**: Rspack + @module-federation/enhanced
- **Monorepo**: pnpm workspaces + Turborepo
- **UI**: React 19
- **State**: Zustand 5 (global) + Jotai (per-app)
- **Types**: TypeScript 5.7+ strict mode
- **Tests**: Vitest (1059+ tests) + Playwright (E2E)
- **Styling**: CSS custom properties with theme system (no CSS-in-JS, no Tailwind)

## Project Structure
```
packages/
  core/           - Desktop shell — components, hooks, styles (Host MF, port 3000)
  types/          - Shared TypeScript interfaces and Zod schemas
  state/          - Zustand stores (windows, registry, shortcuts, notifications, contextMenu, permissions, settings, commands)
  sdk/            - Workspace SDK for remote apps (hooks, bridges, context menus)
  create-app/     - CLI scaffolding tool (create, dev, build, publish)
  ai-assistant/   - AI service library (OpenAI integration, tool calling)
  collaboration/  - Real-time collaboration engine (Yjs CRDT, WebSocket/WebRTC)
  collaboration-server/ - Reference WebSocket server for collaboration (port 4000)
apps/
  hello-world/    - Example remote MF (port 3001)
  calculator/     - Calculator with Jotai (port 3002)
  notes/          - Notes app (port 3003)
  file-explorer/  - Virtual filesystem browser (port 3004)
  settings/       - Workspace settings manager (port 3005)
  terminal/       - In-browser terminal emulator (port 3006)
  ai-assistant/   - AI chat assistant UI (port 3007)
  marketplace/    - Plugin marketplace UI (port 3008)
  draw-wasm/      - WebAssembly drawing canvas demo (port 3009)
e2e/              - Playwright end-to-end tests
documentos/       - ADRs, RFCs, concept docs, roadmap
```

## Key Commands
- `pnpm dev` - Start all dev servers (Turborepo)
- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm typecheck` - TypeScript check
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:e2e` - Run Playwright E2E tests
- `pnpm storybook` - Launch Storybook component explorer
- `pnpm clean` - Clean all build artifacts

## Key Store Names
- `useWindowsStore` - Window lifecycle, z-index, focus, bounds, tiling
- `useAppRegistryStore` - App manifest registry (NOT `useRegistryStore`)
- `registryQueries` - Non-reactive registry queries (getApp, getAllApps, getAppByName)
- `useCommandRegistryStore` - Command palette registry
- `useShortcutsStore` - Keyboard shortcut registry
- `useNotificationsStore` - Toast notifications
- `useContextMenuStore` - Right-click context menus
- `usePermissionsStore` - App permissions
- `useSettingsStore` - Workspace settings
- `useMenuRegistryStore` - Application and context menu items
- `useWidgetRegistryStore` - Status bar widgets
- `useCollaborationStore` - Real-time collaboration state (users, cursors, shared windows)

## Architecture Decisions
- See `documentos/ARCHBASE-ADR-*.md` for ADRs
- See `documentos/ARCHBASE-RFC-*.md` for RFCs
- See `documentos/ARCHBASE-WORKSPACE-SDK-API.md` for SDK API reference
- See `documentos/ARCHBASE-WORKSPACE-GETTING-STARTED.md` for tutorial

## Conventions
- File naming: camelCase for services/hooks, PascalCase for React components
- Commit messages: Conventional Commits (feat:, fix:, docs:, etc.)
- Window types use `WorkspaceWindow` (not `Window` to avoid collision with DOM)
- Three app rendering modes: Module Federation (`RemoteApp`), iframe sandbox (`SandboxedApp`), WebAssembly (`WasmApp`) — dispatched by `manifest.runtime` / `manifest.wasm` / `manifest.sandbox`
- Remote MF apps loaded dynamically via `loadRemote()` from MF enhanced runtime
- Package namespace: `@archbase/workspace-*` for core packages
- CSS uses `experiments: { css: true }` in Rspack config (native CSS modules)
- Stores accessed imperatively in services via `useXxxStore.getState()`
- Theme system: `useThemeApplier` (core, applies `data-theme` to `<html>`), `useTheme` (SDK hook for remote apps)
- Theme modes: `dark` (default), `light`, `auto` (follows OS via `prefers-color-scheme`)
- Theme setting key: `workspace.theme` in Settings store

## PWA & Storage
- Service Worker: `packages/core/public/sw.js` (vanilla Cache API, no Workbox)
- SW Registration: skipped on localhost unless `archbase:sw:enable-dev` in localStorage
- IndexedDB: `idb` library, 2 separate databases (`archbase-zustand` for state, `archbase-app-storage` for SDK)
- Settings persist via Zustand `persist` middleware with custom IDB PersistStorage
- StorageProvider: `StorageProvider` interface + `LocalStorageProvider` + `IndexedDBProvider`
- Async hooks: `useAsyncStorage(appId, key, defaultValue)` returns `[value, setValue, isLoading]`
- MF remotes intentionally NOT cached by SW (avoids stale versions)

## Real-Time Collaboration
- Engine: `@archbase/collaboration` with Yjs CRDT for state sync
- Transports: `WebSocketTransport` (default, server-mediated), `WebRTCTransport` (P2P data channels)
- Client: `CollaborationClient` orchestrates cursor/presence/window sync/follow services
- Server: `@archbase/collaboration-server` (port 4000), `ws` library + Yjs sync protocol
- Store: `useCollaborationStore` (connected, users, cursors, sharedWindows, followingUserId)
- SDK: `useCollaboration()` hook, `createCollaborationService()` for remote apps
- UI: `CursorOverlay` (SVG cursors), `PresencePanel` (online users), `CollaborationBadge` (window header)
- Identity: Local-only (`CollaborationUser { id, displayName, color }`), no auth required
- Cursor palette: 8 colors (`CURSOR_PALETTE`), assigned on room entry
- Encoding: Binary TLV (`encodeMessage`/`decodeMessage`) for efficient WebSocket messages

## WebAssembly Apps
- Loader: `packages/core/src/services/wasmLoader.ts` — fetch, compile (streaming + fallback), cache, instantiate
- Component: `packages/core/src/components/WasmApp.tsx` — canvas/DOM rendering, input forwarding, resize observer, animation loop
- Types: `packages/types/src/wasm.ts` — `WasmConfig`, `WasmAppApi`, `WasmRuntime`, input event types
- Manifest fields: `AppManifest.wasm?: WasmConfig` and `AppManifest.runtime?: 'mf' | 'wasm' | 'iframe'`
- Render modes: `canvas-2d`, `canvas-webgl`, `dom`, `hybrid` (canvas + DOM)
- Module types: `emscripten`, `wasm-pack`, `standalone`
- SDK injection: `api.setSDK(sdk)` — same JS context, no postMessage needed
- Module cache: LRU bounded (max 50 compiled modules), runtime cache keyed by windowId
- Fetch timeout: 30s via AbortController
- Asset pre-fetch: `Promise.allSettled` (best-effort, non-blocking)
- CSS isolation: supports `ShadowContainer` when `manifest.isolation.css === 'shadow'`
