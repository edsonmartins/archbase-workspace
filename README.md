# Archbase Workspace

A React library for building multi-app workspaces with professional window management and federated microfrontend support. Unify multiple web systems — regardless of framework (React, Angular, Vue, Svelte, Web Components) — into a single, cohesive desktop-like interface.

> **Archbase Workspace is NOT an operating system.** It is a **workspace organizer**: think VSCode with extensions, Adobe Creative Cloud, or Salesforce — multiple apps, one professional interface.

<p align="center">
  <img src="images/infografico_main.png" alt="Archbase Workspace — One Workspace, Every App, Any Framework" width="800" />
</p>

---

## Why Archbase Workspace?

Organizations often have multiple web systems built with different technologies over the years. An ERP in Angular, a CRM in React, a BI dashboard in Vue, admin tools in Svelte. Users must juggle browser tabs and lose context switching between them.

Archbase Workspace solves this by loading all these systems as federated apps inside a unified window manager with drag, resize, snap, keyboard shortcuts, and a consistent UX — powered by **Module Federation 2.0**.

### Key Differentiators

- **Framework-agnostic**: Load apps from any framework (React, Angular, Vue, Svelte, Web Components, jQuery)
- **Module Federation 2.0 native**: Runtime-independent, shared dependencies, TypeScript types across boundaries
- **Enterprise-grade**: Permission system, CSP headers, sandbox mode, audit logs (planned), WCAG 2.1 AA
- **Zero runtime dependencies**: No framer-motion, no Fuse.js — only native browser APIs
- **Part of the Archbase Ecosystem**: Integrates with `archbase-react`, `archbase-app-framework`, and `archbase-flutter`

---

## Archbase Ecosystem

```
ARCHBASE ECOSYSTEM
│
├── archbase-react            → Component Library (React)
├── archbase-app-framework    → Backend Framework (Java)
├── archbase-flutter          → Mobile Framework (Flutter)
└── archbase-workspace        → Multi-App Workspace Organizer (React + MF 2.0)  ★
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Rspack + `@module-federation/enhanced` |
| Monorepo | pnpm workspaces + Turborepo |
| UI | React 19 |
| State (global) | Zustand 5 with `devtools` + `subscribeWithSelector` |
| State (per-app) | Jotai |
| Types | TypeScript 5.7+ strict mode |
| Validation | Zod v4 (manifest schemas) |
| Tests | Vitest (605+ tests passing) |
| E2E | Playwright |
| Styling | CSS Variables (theming via custom properties) |

---

## Project Structure

```
archbase-workspace/
├── packages/
│   ├── core/           # Desktop shell — components, hooks, styles (Host MF, port 3000)
│   ├── types/          # Shared TypeScript interfaces and Zod schemas
│   ├── state/          # Zustand stores (windows, registry, shortcuts, notifications, contextMenu, permissions, settings, commands)
│   ├── sdk/            # Workspace SDK for remote apps (hooks, bridges, context menus)
│   ├── create-app/     # CLI scaffolding tool (create, dev, build, publish)
│   └── ai-assistant/   # AI service library (OpenAI integration, tool calling)
├── apps/
│   ├── hello-world/    # Example remote app (port 3001)
│   ├── calculator/     # Calculator with Jotai state (port 3002)
│   ├── notes/          # Notes app (port 3003)
│   ├── file-explorer/  # Virtual filesystem browser (port 3004)
│   ├── settings/       # Workspace settings manager (port 3005)
│   ├── terminal/       # In-browser terminal emulator (port 3006)
│   └── ai-assistant/   # AI chat assistant with OpenAI (port 3007)
├── e2e/                # Playwright end-to-end tests
├── .storybook/         # Storybook configuration
├── documentos/         # ADRs, RFCs, concept docs, roadmap
└── CLAUDE.md           # Project instructions for AI-assisted development
```

### Package Details

**`@archbase/workspace-types`** — Shared type definitions
Window types (`WorkspaceWindow`, `WindowState`), app manifest types (`AppManifest`), Zod validation schemas, keyboard shortcut types, notification types, context menu types, snap zone types.

**`@archbase/workspace-state`** — Zustand stores
`useWindowsStore` (window lifecycle, z-index, focus, bounds, tiling), `useAppRegistryStore` (app manifest registry with Zod validation), `useShortcutsStore` (keyboard shortcut registry with conflict detection), `useNotificationsStore` (toast notifications), `useContextMenuStore` (right-click context menus), `usePermissionsStore` (app permissions), `useSettingsStore` (workspace settings), `useCommandRegistryStore` (command palette).

**`@archbase/workspace-core`** — Desktop shell
Components: `Desktop`, `Window`, `WindowHeader`, `Taskbar`, `AppLauncher`, `SnapPreview`, `ToastContainer`, `RemoteApp`, `CommandPalette`, `PermissionPrompt`.
Hooks: `useDrag` (pointer-based drag with snap zones), `useResize` (8-direction resize), `useGlobalKeyboardListener`.
Utilities: `parseKeyCombo`, `computeSnapZones`.

**`@archbase/workspace-sdk`** — App SDK
`createWorkspaceSDK()` (full SDK for host apps), `createSecureSDK()` (sandboxed SDK with permissions). Hooks: `useWorkspace()`, `useWindowContext()`, `useCommand()`, `useSettingValue()`, `useStorage()`. Bridges: `createHostBridge()`, `createIframeBridgeSDK()`.

**`@archbase/workspace-create-app`** — CLI tool
`create-app <name>` (scaffold new remote app), `create-app dev` (start dev server), `create-app build` (production build), `create-app publish` (publish to registry).

**`@archbase/ai-assistant`** — AI service library
`AIAssistantService` (OpenAI integration with function calling), 15 workspace tools (open/close/focus/tile windows, execute commands, notifications, settings), `buildSystemPrompt()` (context builder), `executeTool()` / `executeToolCalls()` (tool executor).

---

## Features

### Window Management
- Drag and resize with Pointer Events API and `requestAnimationFrame` throttling
- 8-direction resize handles (N, NE, E, SE, S, SW, W, NW)
- Min/max size constraints per window
- Minimize, maximize, restore with saved bounds
- Z-index focus management with focus stack
- GPU-accelerated positioning (`transform: translate3d()`)
- Tiling (horizontal, vertical) and cascading layouts

### Module Federation
- Dynamic remote loading via `@module-federation/enhanced`
- Per-window error boundaries (crash in one app doesn't affect others)
- Loading and error states with retry
- Shared React/ReactDOM singleton across host and remotes

### Desktop Environment
- **App Launcher** — `Cmd+K` / `Ctrl+K` overlay with search and keyboard navigation
- **Window Snap** — Drag to edges/corners for half/quarter snapping with visual preview
- **Keyboard Shortcuts** — 8+ built-in shortcuts (close, minimize all, focus cycle, tile, cascade)
- **Context Menus** — Right-click menus with full keyboard navigation (WAI-ARIA compliant)
- **Toast Notifications** — Info, success, warning, error toasts with auto-dismiss
- **Taskbar** — Running apps, launcher button, active window indicator

### Theming
- **Dark / Light / Auto** modes via `workspace.theme` setting
- ~80 CSS custom properties for all UI colors
- Auto mode follows OS preference (`prefers-color-scheme`) in real-time
- SDK `useTheme()` hook for remote apps to read resolved theme

### Accessibility
- ARIA roles on all interactive elements (`dialog`, `separator`, `menu`, `combobox`)
- Keyboard navigation throughout (focus trap in menus, arrow keys, Enter/Space/Escape)
- Screen reader labels on resize handles, control buttons, and menu items

---

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.x

### Install & Run

```bash
# Install dependencies
pnpm install

# Start all dev servers (host + remotes)
pnpm dev
```

This starts:
- Host shell on `http://localhost:3000`
- Hello World app on `http://localhost:3001`
- Calculator app on `http://localhost:3002`
- Notes app on `http://localhost:3003`
- File Explorer app on `http://localhost:3004`
- Settings app on `http://localhost:3005`
- Terminal app on `http://localhost:3006`
- AI Assistant app on `http://localhost:3007`

### Other Commands

```bash
# Build all packages
pnpm build

# Run all tests (605+ tests)
pnpm test

# Run tests with coverage report
pnpm test:coverage

# TypeScript type checking
pnpm typecheck

# Run E2E tests (requires dev servers running)
pnpm test:e2e

# Launch Storybook component explorer
pnpm storybook

# Clean all build artifacts
pnpm clean
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open/close App Launcher |
| `Cmd+Shift+P` / `Ctrl+Shift+P` | Open Command Palette |
| `Cmd+W` / `Ctrl+W` | Close focused window |
| `Cmd+M` / `Ctrl+M` | Minimize all windows |
| `Cmd+,` / `Ctrl+,` | Open Settings |
| `` Cmd+` `` / `` Ctrl+` `` | Focus next window |
| `` Cmd+Shift+` `` / `` Ctrl+Shift+` `` | Focus previous window |
| `Cmd+Shift+H` / `Ctrl+Shift+H` | Tile windows horizontally |
| `Cmd+Shift+V` / `Ctrl+Shift+V` | Tile windows vertically |
| `Cmd+Shift+C` / `Ctrl+Shift+C` | Cascade windows |

---

## Architecture Decisions

<p align="center">
  <img src="images/infografico_secondary.png" alt="Archbase Workspace — Technical Enterprise Infographic" width="700" />
</p>

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Rspack as Build System | Accepted |
| ADR-002 | Monorepo with pnpm + Turborepo | Accepted |
| ADR-003 | Zustand + Jotai for State Management | Accepted |
| ADR-004 | Pointer Events for Drag & Resize | Accepted |

See `documentos/ARCHBASE-ADR-*.md` for full decision records.

---

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Walking Skeleton — Rspack + MF + basic window | Complete |
| Phase 1 | Window Management — drag, resize, focus, min/max | Complete |
| Phase 2 | Module Federation — registry, dynamic loading, error boundaries | Complete |
| Phase 3 | Desktop Environment — launcher, snap, shortcuts, context menus, toasts | Complete |
| Phase 4 | Plugin System & SDK — activation events, CLI, SDK package | Complete |
| Phase 5 | Isolation & Security — Shadow DOM, permissions, sandboxed iframe | Complete |
| Phase 6 | Advanced Features — AI assistant, themes, i18n, plugins marketplace | In Progress |

See `documentos/ARCHBASE-WORKSPACE-ROADMAP.md` for the full roadmap.

---

## Use Cases

### Multi-Framework Unification
An organization has ERP (Angular), CRM (React), BI (Vue), and admin tools (Svelte). Archbase Workspace loads all of them as federated apps in a single window-managed interface with unified theming and SSO.

### Gradual Technology Migration
A legacy Angular system coexists with new React modules for years during migration. Both run side by side in the workspace with full interop.

### Enterprise Internal Tools
10+ internal tools from different teams consolidated into a single platform with consistent UX, keyboard shortcuts, and centralized access.

### Healthcare / Regulated Industries
Patient records (Web Components, certified), PACS viewer (React), scheduling (Angular), and billing (legacy jQuery) — all in one HIPAA-compliant workspace with sandboxing and permissions.

---

## Conventions

- **File naming**: camelCase for hooks/utilities, PascalCase for React components
- **Window types**: Use `WorkspaceWindow` (avoids collision with DOM `Window`)
- **Remote apps**: Loaded dynamically via `loadRemote()` from MF enhanced runtime
- **State**: Zustand stores with `devtools` + `subscribeWithSelector` middleware
- **Styling**: CSS custom properties (no CSS-in-JS, no Tailwind)
- **Testing**: Vitest with in-source testing for stores, separate test files for utilities

---

## License

MIT License — See [LICENSE](LICENSE) for details.

---

**Maintained by**: Edson Martins (CTO/Founder, IntegrAllTech)
**Part of**: [Archbase Ecosystem](https://github.com/edsonmartins)
