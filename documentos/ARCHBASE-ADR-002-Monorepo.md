# ADR-002: pnpm Workspaces + Turborepo for Monorepo Management

**Status**: Accepted (2025-02-15)

**Decision Makers**: Edson (CTO/Founder)

**Stakeholders**: Development team, open source contributors

---

## Context and Problem

The Archbase Workspace project requires managing multiple packages and applications in a single repository:

- **9 packages**: `core` (desktop shell), `types` (shared interfaces), `state` (Zustand stores), `sdk` (workspace SDK), `create-app` (CLI scaffolding), `ai-assistant` (AI service), `collaboration` (real-time engine), `collaboration-server` (WebSocket server)
- **9+ apps**: `hello-world`, `calculator`, `notes`, `file-explorer`, `settings`, `terminal`, `ai-assistant`, `marketplace`, `draw-wasm`
- **1 e2e package**: Playwright end-to-end tests

Key requirements:

1. **Fast installs** — large dependency tree with React 19, Zustand 5, Rspack, and Module Federation
2. **Task orchestration** — builds must respect dependency order (types before state before sdk before core)
3. **Caching** — avoid rebuilding unchanged packages in CI and locally
4. **Strict dependency management** — prevent phantom dependencies (importing a package not declared in `package.json`)
5. **Developer experience** — single command to start all dev servers, run all tests, or build everything

### Alternatives Considered

#### 1. **Nx**
- Supports task caching and dependency graph
- Rich plugin ecosystem (generators, executors)
- **Too opinionated**: Imposes its own project structure and configuration patterns
- **Heavy**: Large runtime dependency, complex configuration for simple setups
- **Lock-in**: Difficult to eject once adopted

#### 2. **Lerna (standalone)**
- Historically the default monorepo tool for JavaScript
- **Deprecated/less maintained**: Acquired by Nx but lost independent development momentum
- **No task caching** in standalone mode (requires Nx integration for caching)
- **Slower installs**: Uses npm or yarn under the hood

#### 3. **npm Workspaces**
- Built into npm, zero additional tooling
- **Slower installs**: npm is significantly slower than pnpm for large monorepos
- **No task orchestration**: No built-in concept of build order or caching
- **Flat `node_modules`**: Allows phantom dependencies (any package can import anything)

#### 4. **pnpm Workspaces + Turborepo** -- CHOSEN
- **pnpm**: Fastest package manager, strict `node_modules` isolation via symlinks, content-addressable store saves disk space
- **Turborepo**: Lightweight task runner with remote caching, dependency-aware execution, zero-config for simple setups
- Both tools are well-maintained and widely adopted
- Minimal configuration overhead

---

## Decision

**Use pnpm workspaces for package management and Turborepo for task orchestration.**

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
  - "e2e"
```

### Task Pipeline

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "clean": {
      "cache": false
    },
    "test:e2e": {
      "cache": false,
      "dependsOn": ["build"]
    }
  }
}
```

### Package Namespace

All core packages use the `@archbase/workspace-*` namespace:

- `@archbase/workspace-types`
- `@archbase/workspace-state`
- `@archbase/workspace-sdk`
- `@archbase/workspace-core`
- `@archbase/workspace-create-app`
- `@archbase/workspace-ai-assistant`
- `@archbase/collaboration`
- `@archbase/collaboration-server`

### Dependency Graph

```
                    @archbase/workspace-types
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
    @archbase/         @archbase/   @archbase/
    workspace-state    collaboration collaboration-server
              │           │
              ▼           │
    @archbase/            │
    workspace-sdk ◄───────┘
              │
    ┌─────────┼────────────────┐
    ▼         ▼                ▼
  @archbase/  apps/*         @archbase/
  workspace-  (hello-world,  workspace-
  core        calculator,    ai-assistant
              notes, ...)
```

---

## Consequences

### Positive

1. **Fast installs** — pnpm is 2-3x faster than npm; content-addressable store avoids duplicate downloads across packages
2. **Strict isolation** — pnpm's symlinked `node_modules` prevents phantom dependencies; each package only sees what it declares
3. **Cached builds** — Turborepo skips unchanged packages; `pnpm build` on a no-op is near-instant
4. **Dependency-aware execution** — `"dependsOn": ["^build"]` ensures `types` builds before `state`, `state` before `sdk`, etc.
5. **Parallel dev servers** — `pnpm dev` starts all 9+ dev servers in parallel via Turborepo's `persistent` tasks
6. **Single lockfile** — `pnpm-lock.yaml` is the single source of truth for all dependency versions
7. **Disk space savings** — pnpm's content-addressable store deduplicates packages across all workspace members

### Negative

1. **Two tools to learn** — pnpm for package management, Turborepo for task orchestration
   - Mitigated: Both have minimal configuration and excellent documentation
2. **pnpm strictness can be annoying** — some poorly-written packages assume flat `node_modules`
   - Mitigated: `pnpm.overrides` or `.npmrc` settings (`shamefully-hoist=true`) as escape hatch
3. **Turborepo remote caching requires Vercel account** — optional, local caching works without it

### Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start all dev servers (Turborepo) |
| `pnpm build` | Build all packages in dependency order |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm clean` | Remove all `dist/` directories |
| `pnpm test:e2e` | Run Playwright E2E tests |

---

## Impact on Other Decisions

- **ADR-001 (Rspack)**: Rspack integrates well with pnpm; Module Federation shared dependencies are managed at workspace level
- **ADR-003 (Zustand + Jotai)**: State packages are workspace members, shared as MF singletons
- **CI/CD**: Turborepo caching reduces CI build times; `pnpm install --frozen-lockfile` ensures reproducible installs

---

## Metrics of Success

- [x] All 13+ packages build in dependency order with single command
- [x] Incremental builds skip unchanged packages
- [x] Dev servers for all apps start in parallel
- [x] No phantom dependency issues in production builds
- [x] `pnpm install` completes in under 30 seconds (warm cache)

---

## References

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm vs npm vs yarn Benchmark](https://pnpm.io/benchmarks)

---

**Last Updated**: 2026-02-17
**Review Needed**: If package count exceeds 20 or CI times degrade
