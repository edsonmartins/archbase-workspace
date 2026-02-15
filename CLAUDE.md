# Archbase Workspace - Project Instructions

## What is this project?
A multi-app workspace that unifies web systems from different frameworks (React, Angular, Vue, Svelte) into a professional interface with window management, powered by Module Federation 2.0.

## Tech Stack
- **Build**: Rspack + @module-federation/enhanced
- **Monorepo**: pnpm workspaces + Turborepo
- **UI**: React 19
- **State**: Zustand 5 (global) + Jotai (per-app)
- **Types**: TypeScript 5.7+ strict mode
- **Tests**: Vitest

## Project Structure
```
packages/
  core/     - Desktop shell (Host MF, port 3000)
  types/    - Shared TypeScript interfaces
  state/    - Zustand stores (windows, registry)
apps/
  hello-world/  - Example remote MF (port 3001)
  calculator/   - Calculator with Jotai (port 3002)
  notes/        - Notes app (port 3003)
```

## Key Commands
- `pnpm dev` - Start all dev servers (Turborepo)
- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm typecheck` - TypeScript check

## Architecture Decisions
- See `documentos/ARCHBASE-ADR-*.md` for ADRs
- See `documentos/ARCHBASE-RFC-*.md` for RFCs

## Conventions
- File naming: camelCase for services/hooks, PascalCase for React components
- Commit messages: Conventional Commits (feat:, fix:, docs:, etc.)
- Window types use `WorkspaceWindow` (not `Window` to avoid collision with DOM)
- Remote apps loaded dynamically via `loadRemote()` from MF enhanced runtime
