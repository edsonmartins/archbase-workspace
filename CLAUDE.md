# Archbase Workspace - Project Instructions

## What is this project?
A multi-app workspace that unifies web systems from different frameworks (React, Angular, Vue, Svelte) into a professional interface with window management, powered by Module Federation 2.0.

## Tech Stack
- **Build**: Rspack + @module-federation/enhanced
- **Monorepo**: pnpm workspaces + Turborepo
- **UI**: React 19
- **State**: Zustand 5 (global) + Jotai (per-app)
- **Types**: TypeScript 5.7+ strict mode
- **Tests**: Vitest (600+ tests) + Playwright (E2E)
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
apps/
  hello-world/    - Example remote MF (port 3001)
  calculator/     - Calculator with Jotai (port 3002)
  notes/          - Notes app (port 3003)
  file-explorer/  - Virtual filesystem browser (port 3004)
  settings/       - Workspace settings manager (port 3005)
  terminal/       - In-browser terminal emulator (port 3006)
  ai-assistant/   - AI chat assistant UI (port 3007)
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

## Architecture Decisions
- See `documentos/ARCHBASE-ADR-*.md` for ADRs
- See `documentos/ARCHBASE-RFC-*.md` for RFCs
- See `documentos/ARCHBASE-WORKSPACE-SDK-API.md` for SDK API reference
- See `documentos/ARCHBASE-WORKSPACE-GETTING-STARTED.md` for tutorial

## Conventions
- File naming: camelCase for services/hooks, PascalCase for React components
- Commit messages: Conventional Commits (feat:, fix:, docs:, etc.)
- Window types use `WorkspaceWindow` (not `Window` to avoid collision with DOM)
- Remote apps loaded dynamically via `loadRemote()` from MF enhanced runtime
- Package namespace: `@archbase/workspace-*` for core packages
- CSS uses `experiments: { css: true }` in Rspack config (native CSS modules)
- Stores accessed imperatively in services via `useXxxStore.getState()`
- Theme system: `useThemeApplier` (core, applies `data-theme` to `<html>`), `useTheme` (SDK hook for remote apps)
- Theme modes: `dark` (default), `light`, `auto` (follows OS via `prefers-color-scheme`)
- Theme setting key: `workspace.theme` in Settings store
