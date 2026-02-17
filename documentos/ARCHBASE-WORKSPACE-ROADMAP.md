# Archbase Workspace-like Library - Roadmap

**Version**: 1.0  
**Last Updated**: 2026-02-16
**Status**: Fase 6 Complete (Phases 0-5 Complete, AI Assistant + Theme System + PWA + Real-Time Collaboration + Plugin Marketplace + WebAssembly Apps Implemented)

---

## Vision

Criar biblioteca React para interfaces desktop-like com suporte a microfrontends federados, permitindo que empresas construam plataformas SaaS multi-app com window management profissional e plugin system extensível.

**Diferencial**: Única biblioteca que combina window management + Module Federation 2.0 + plugin architecture VSCode-inspired.

---

## Success Criteria (v1.0)

- [ ] 50+ janelas simultâneas rodando a 60fps
- [ ] 5+ apps exemplo funcionais (Calculator, Notes, File Explorer, Settings, Terminal)
- [ ] SDK publicado no npm (`@archbase/workspace-sdk`)
- [ ] CLI para scaffolding (`npx @archbase/workspace-create-app`)
- [ ] Docs completas com tutorials
- [ ] Storybook com todos os componentes
- [ ] 80%+ test coverage
- [ ] Acessibilidade WCAG 2.1 AA

---

## Timeline Overview

```
Fase 0: Walking Skeleton          [1 semana]   ████████░░░░░░░░░░░░░░░░░░░░
Fase 1: Window Management Core    [3 semanas]  ░░░░░░░░████████████░░░░░░░░
Fase 2: Module Federation         [2 semanas]  ░░░░░░░░░░░░░░░░░░░░████████
Fase 3: Desktop Environment       [3 semanas]  ░░░░░░░░░░░░░░░░░░░░░░░░████████████
Fase 4: Plugin System             [4 semanas]  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████
Fase 5: Isolamento & Segurança    [2 semanas]  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████
Fase 6: Features Avançadas        [ongoing]    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                   └─────────────────────────────────────────────────────────────►
                                    Semana: 1  3  5  7  9  11 13 15 17 19 21 23 25
```

**Total estimado**: 15 semanas (~4 meses) para v1.0 production-ready

---

## Fase 0: Walking Skeleton 🚶 (Semana 1)

**Objetivo**: Provar que stack técnica funciona integrada end-to-end

**Deliverables**:
- Desktop shell renderiza
- 1 janela hardcoded (sem drag, sem resize)
- 1 app federada "Hello World" carrega via Module Federation
- Rspack build pipeline funciona
- Deploy automático (Vercel)
- CI/CD básico (lint, typecheck, build)

### Tasks

```
├─ Setup Monorepo (Dia 1-2)
│  ├─ [ ] Inicializar pnpm workspaces
│  ├─ [ ] Configurar Turborepo
│  ├─ [ ] Setup TypeScript project references
│  └─ [ ] ADR-002: Estrutura de Monorepo ✅
│
├─ Packages Structure (Dia 2)
│  ├─ [ ] packages/core (desktop shell)
│  ├─ [ ] packages/types (shared types)
│  └─ [ ] apps/hello-world (remote MF)
│
├─ Rspack + Module Federation (Dia 3-4)
│  ├─ [ ] Rspack config para host (packages/core)
│  ├─ [ ] Rspack config para remote (apps/hello-world)
│  ├─ [ ] Shared dependencies (React, ReactDOM)
│  ├─ [ ] Test: Load remote dinamicamente
│  └─ [ ] ADR-001: Rspack Build System ✅
│
├─ Simple Window (Dia 4-5)
│  ├─ [ ] <Window> component (sem drag)
│  ├─ [ ] Renderiza app federada dentro
│  ├─ [ ] CSS básico (border, header)
│  └─ [ ] Test: Window renderiza corretamente
│
└─ CI/CD (Dia 5)
   ├─ [ ] GitHub Actions (lint, typecheck, build)
   ├─ [ ] Vercel deploy automático
   └─ [ ] Badge no README (build status)
```

**Exit Criteria**:
- ✅ URL pública mostrando 1 janela com Hello World app
- ✅ Build passa em CI
- ✅ TypeScript sem erros
- ✅ 2 ADRs escritos e aprovados

**Risks**:
- ⚠️ Module Federation pode não funcionar como esperado
- ⚠️ Rspack pode ter bugs desconhecidos
- **Mitigação**: Se MF falhar em 2 dias, fallback para Webpack (compatible)

---

## Fase 1: Window Management Core 🪟 (Semanas 2-4)

**Objetivo**: Window manager funcional com drag, resize, focus, minimize, maximize

**Deliverables**:
- WindowService com state management (Zustand)
- Drag & drop de janelas
- Resize com 8 handles
- Z-index e focus management
- Minimize/maximize/restore
- 3-5 apps dummy para testar

### Tasks (Semana 2)

```
├─ State Management (Dia 1-2)
│  ├─ [ ] Setup Zustand store
│  ├─ [ ] WindowsStore (windows Map, focusStack)
│  ├─ [ ] Actions: open, close, focus
│  ├─ [ ] Selectors granulares
│  ├─ [ ] Tests: State transitions
│  └─ [ ] ADR-003: Zustand + Jotai ✅
│
├─ Window Service API (Dia 3-4)
│  ├─ [ ] windowService.open(options)
│  ├─ [ ] windowService.close(id)
│  ├─ [ ] windowService.focus(id)
│  ├─ [ ] Event handlers (onFocus, onClose)
│  ├─ [ ] React hooks (useWindow, useWindowService)
│  ├─ [ ] Tests: API funciona corretamente
│  └─ [ ] RFC-001: Window Service API ✅
│
└─ Z-index Management (Dia 5)
   ├─ [ ] focusStack array
   ├─ [ ] Recalcula z-indexes ao focar
   ├─ [ ] All windows são siblings (mesma parent)
   └─ [ ] Test: Focar janela move para topo
```

### Tasks (Semana 3)

```
├─ Drag Implementation (Dia 1-3)
│  ├─ [ ] useDrag hook com Pointer Events
│  ├─ [ ] onPointerDown captura pointer
│  ├─ [ ] onPointerMove com rAF throttling
│  ├─ [ ] transform: translate3d() para posição
│  ├─ [ ] Cursor: grabbing durante drag
│  ├─ [ ] Tests: Drag move janela corretamente
│  └─ [ ] ADR-004: Pointer Events ✅
│
├─ Resize Implementation (Dia 4-5)
│  ├─ [ ] 8 resize handles (n, ne, e, se, s, sw, w, nw)
│  ├─ [ ] useResize hook
│  ├─ [ ] Cursor específico por handle
│  ├─ [ ] minWidth/minHeight constraints
│  └─ [ ] Tests: Resize funciona em todos handles
```

### Tasks (Semana 4)

```
├─ State Management (Dia 1-2)
│  ├─ [ ] windowService.minimize(id)
│  ├─ [ ] windowService.maximize(id)
│  ├─ [ ] windowService.restore(id)
│  ├─ [ ] Salva bounds anteriores
│  └─ [ ] Tests: State transitions
│
├─ Performance (Dia 3-4)
│  ├─ [ ] Benchmark: 50 janelas a 60fps
│  ├─ [ ] will-change apenas durante drag
│  ├─ [ ] Cancelamento de rAF
│  ├─ [ ] Profiling com Chrome DevTools
│  └─ [ ] Fix bottlenecks se necessário
│
└─ Dummy Apps (Dia 5)
   ├─ [ ] apps/calculator-dummy (simples)
   ├─ [ ] apps/notes-dummy
   ├─ [ ] apps/settings-dummy
   └─ [ ] Test: Múltiplas janelas abertas
```

**Exit Criteria**:
- ✅ 5 janelas simultâneas drag/resize funcionando
- ✅ Focus management correto
- ✅ Minimize/maximize animado
- ✅ Tests coverage > 70%
- ✅ Performance: 60fps mantido

**Demo**: Screen recording de 5 janelas sendo manipuladas

---

## Fase 2: Module Federation Integration 🔗 (Semanas 5-6)

**Objetivo**: Apps federadas reais substituem dummies, com loading states e error handling

**Deliverables**:
- App Registry com manifests
- Dynamic remote loading (loadRemoteModule)
- Error boundaries por janela
- TypeScript types automáticos (MF 2.0)
- Shared dependencies funcionando

### Tasks (Semana 5)

```
├─ App Manifest (Dia 1-2)
│  ├─ [ ] manifest.json schema
│  ├─ [ ] Zod validation
│  ├─ [ ] TypeScript types
│  ├─ [ ] Tests: Manifest parsing
│  └─ [ ] RFC-002: Manifest Structure ✅
│
├─ App Registry (Dia 3-4)
│  ├─ [ ] AppRegistry class
│  ├─ [ ] discover(sources) method
│  ├─ [ ] Validate manifests
│  ├─ [ ] Store em Map
│  └─ [ ] Tests: Registry funciona
│
└─ Manifest Discovery (Dia 5)
   ├─ [ ] Load de URL (fetch)
   ├─ [ ] Load de file (import)
   ├─ [ ] Cache validados
   └─ [ ] Error handling
```

### Tasks (Semana 6)

```
├─ Dynamic Loading (Dia 1-3)
│  ├─ [ ] loadRemoteModule(url, scope, module)
│  ├─ [ ] __webpack_share_scopes__ setup
│  ├─ [ ] Error handling (timeout, 404)
│  ├─ [ ] Loading states
│  └─ [ ] Tests: Load remote corretamente
│
├─ React Integration (Dia 4)
│  ├─ [ ] <RemoteApp appId={} windowId={} />
│  ├─ [ ] <Suspense> + <ErrorBoundary>
│  ├─ [ ] Fallback components
│  └─ [ ] Tests: Error boundary funciona
│
└─ TypeScript Setup (Dia 5)
   ├─ [ ] MF 2.0 auto-generate .d.ts
   ├─ [ ] Publish @archbase/workspace-types
   ├─ [ ] Apps importam types
   └─ [ ] Test: IntelliSense funciona
```

**Exit Criteria**:
- ✅ 3 apps reais carregadas via MF
- ✅ Crash em 1 app não mata desktop
- ✅ Types sincronizados host ↔ remote
- ✅ Shared deps (React) singleton funcionando

**Demo**: Abrir 3 apps, crashar 1, outras continuam funcionando

---

## Fase 3: Desktop Environment 🖥️ (Semanas 7-9)

**Objetivo**: UX completa de desktop (taskbar, launcher, shortcuts, menus)

**Deliverables**:
- Taskbar com running apps
- Application launcher (Cmd+K style)
- Window snap e magnetic edges
- Keyboard shortcuts system
- Context menus
- Notification system

### Tasks (Semana 7)

```
├─ Taskbar (Dia 1-3)
│  ├─ [ ] <Taskbar> component (fixed position)
│  ├─ [ ] Start button
│  ├─ [ ] Running apps icons
│  ├─ [ ] Active indicator
│  ├─ [ ] Click behavior (minimize/restore)
│  └─ [ ] Tests: Taskbar interactions
│
├─ Application Launcher (Dia 4-5)
│  ├─ [ ] <AppLauncher> overlay
│  ├─ [ ] Fuzzy search (Fuse.js)
│  ├─ [ ] useDeferredValue para input
│  ├─ [ ] Keyboard navigation (arrows)
│  ├─ [ ] Shortcut: Cmd+K / Ctrl+K
│  └─ [ ] Tests: Search funciona
```

### Tasks (Semana 8)

```
├─ Window Snap (Dia 1-3)
│  ├─ [ ] Snap zones (halves, quarters)
│  ├─ [ ] Edge detection (20px threshold)
│  ├─ [ ] Visual preview durante drag
│  ├─ [ ] Snap to other windows (magnetic)
│  └─ [ ] Tests: Snap funciona
│
└─ Keyboard Shortcuts (Dia 4-5)
   ├─ [ ] ShortcutService registry
   ├─ [ ] Layered scopes (global > app > window)
   ├─ [ ] Conflict detection
   ├─ [ ] useShortcut hook
   └─ [ ] Tests: Shortcuts funcionam
```

### Tasks (Semana 9)

```
├─ Context Menus (Dia 1-2)
│  ├─ [ ] <ContextMenu> component
│  ├─ [ ] Intercept contextmenu event
│  ├─ [ ] Positioning (boundary check)
│  ├─ [ ] Cascading submenus
│  └─ [ ] Tests: Menu funciona
│
├─ Notifications (Dia 3-4)
│  ├─ [ ] NotificationService
│  ├─ [ ] Toast component (corner)
│  ├─ [ ] Notification center
│  ├─ [ ] Auto-dismiss
│  └─ [ ] Browser Notification API bridge
│
└─ Polish (Dia 5)
   ├─ [ ] Animations (framer-motion)
   ├─ [ ] Transitions suaves
   ├─ [ ] Loading states
   └─ [ ] Error states
```

**Exit Criteria**:
- ✅ Taskbar funcional
- ✅ Launcher com search
- ✅ Window snap implementado
- ✅ 10+ keyboard shortcuts funcionando
- ✅ Context menus e notifications

**Demo**: Workflow completo (lançar app, snap janelas, usar shortcuts)

---

## Fase 4: Plugin System & SDK 🔌 (Semanas 10-13)

**Objetivo**: Third-party apps podem se integrar via SDK

**Deliverables**:
- Activation events (lazy loading)
- Extension points (commands, menus, widgets)
- @archbase/workspace-sdk publicado npm
- CLI tool (@archbase/workspace-cli)
- 5 apps exemplo completas

### Tasks (Semana 10)

```
├─ Activation Events (Dia 1-3)
│  ├─ [ ] ActivationService
│  ├─ [ ] Pattern matching (onCommand:*, onFileType:*)
│  ├─ [ ] Load bundle quando event dispara
│  ├─ [ ] Tests: Activation funciona
│  └─ [ ] RFC-003: Activation Events
│
└─ Extension Points (Dia 4-5)
   ├─ [ ] CommandRegistry
   ├─ [ ] MenuRegistry
   ├─ [ ] WidgetRegistry
   ├─ [ ] Registrar contributions de manifests
   └─ [ ] Tests: Contributions funcionam
```

### Tasks (Semana 11-12)

```
├─ SDK Package (Dia 1-4)
│  ├─ [ ] @archbase/workspace-sdk estrutura
│  ├─ [ ] API: getWindowService()
│  ├─ [ ] API: registerCommand()
│  ├─ [ ] API: showNotification()
│  ├─ [ ] API: getSettings()
│  ├─ [ ] TypeScript declarations
│  ├─ [ ] Build + publish npm
│  └─ [ ] Docs: API reference
│
└─ CLI Tool (Dia 5-8)
   ├─ [ ] @archbase/workspace-cli package
   ├─ [ ] npx @archbase/workspace-create-app
   ├─ [ ] Templates (basic, advanced)
   ├─ [ ] dev command (rspack serve)
   ├─ [ ] build command
   ├─ [ ] publish command (deploy)
   └─ [ ] Tests: CLI funciona
```

### Tasks (Semana 13)

```
├─ Example Apps (Dia 1-4)
│  ├─ [ ] Calculator (completo)
│  ├─ [ ] Notes (com storage)
│  ├─ [ ] File Explorer (tree view)
│  ├─ [ ] Settings (form handling)
│  ├─ [ ] Terminal (xterm.js)
│  └─ [ ] Docs: App development guide
│
└─ Integration Tests (Dia 5)
   ├─ [ ] E2E com Playwright
   ├─ [ ] Test: Criar app via CLI
   ├─ [ ] Test: App usa SDK corretamente
   └─ [ ] Test: Contribution points funcionam
```

**Exit Criteria**:
- ✅ SDK publicado npm
- ✅ CLI tool funcional
- ✅ 5 apps exemplo completas
- ✅ Docs completas

**Demo**: `npx @archbase/workspace-create-app my-app` → app funciona em 5min

---

## Fase 5: Isolamento & Segurança 🔒 (Semanas 14-15)

**Objetivo**: Apps third-party rodando com segurança

**Deliverables**:
- Shadow DOM para CSS isolation
- Permission system
- Sandboxed iframe mode
- Content Security Policy

### Tasks (Semana 14)

```
├─ CSS Isolation (Dia 1-2)
│  ├─ [ ] Shadow DOM wrapper
│  ├─ [ ] style-loader com shadowRoot target
│  ├─ [ ] Design tokens via CSS variables
│  └─ [ ] Tests: CSS não vaza
│
├─ Permission System (Dia 3-4)
│  ├─ [ ] PermissionService
│  ├─ [ ] Check permissions em runtime
│  ├─ [ ] Prompt usuário se necessário
│  ├─ [ ] Deny/Grant UI
│  └─ [ ] RFC-004: Permission Model
│
└─ Sandboxed Mode (Dia 5)
   ├─ [ ] <SandboxedApp> (iframe)
   ├─ [ ] postMessage bridge
   ├─ [ ] sandbox attribute
   └─ [ ] Tests: Sandbox funciona
```

### Tasks (Semana 15)

```
├─ CSP (Dia 1-2)
│  ├─ [ ] Content-Security-Policy headers
│  ├─ [ ] Nonce para inline scripts
│  ├─ [ ] Validar em CI
│  └─ [ ] Docs: Security best practices
│
└─ Security Audit (Dia 3-5)
   ├─ [ ] OWASP Top 10 check
   ├─ [ ] XSS testing
   ├─ [ ] CSRF prevention
   ├─ [ ] Fix vulnerabilities
   └─ [ ] Security docs
```

**Exit Criteria**:
- ✅ CSS isolation funciona
- ✅ Permission system implementado
- ✅ Apps maliciosas contidas
- ✅ Security audit passa

---

## Fase 6: Features Avançadas 🚀 (In Progress)

**Objetivo**: Diferenciais de mercado

### 6.1 AI Desktop Assistant ✅ Complete
- [x] Entende contexto de janelas abertas (contextBuilder.ts)
- [x] Executa comandos cross-app (15 tool definitions via OpenAI function calling)
- [x] Natural language window management (open, close, focus, tile, cascade, minimize)
- [x] Integration com OpenAI API (packages/ai-assistant + apps/ai-assistant, port 3007)
- [x] Chat UI com streaming, tool call badges, thinking indicator
- [x] 47 testes (contextBuilder, toolExecutor, AIAssistantService)

### 6.2 Theme System ✅ Complete
- [x] Light / Dark / Auto theme modes via `workspace.theme` setting
- [x] CSS custom properties architecture (~80 variables in global.css + themes.css)
- [x] `useThemeApplier` hook (core) applies `data-theme` attribute to `<html>`
- [x] `useTheme` SDK hook for remote apps (reactive OS preference listener)
- [x] AI Chat CSS refactored to CSS variables with light theme overrides
- [x] 15 testes (9 useThemeApplier + 6 useTheme logic)

### 6.3 PWA Features ✅ Complete
- [x] Service Worker for offline support (vanilla Cache API, NetworkFirst/CacheFirst/StaleWhileRevalidate)
- [x] IndexedDB storage via `idb` library (archbase-zustand + archbase-app-storage databases)
- [x] StorageProvider abstraction (interface + LocalStorageProvider + IndexedDBProvider)
- [x] Settings persistence via Zustand persist middleware with IDB backend
- [x] Web App Manifest (standalone, landscape, PWA-ready)
- [x] Offline indicator in Taskbar with `useSyncExternalStore`
- [x] `useAsyncStorage` hook for remote apps
- [x] 32 testes (10 asyncStorage + 11 storageProvider + 4 idbStorage + 3 onlineStatus + 4 swRegistration)

### 6.4 Real-Time Collaboration ✅ Complete

- [x] Collaboration types (`CollaborationUser`, `RoomInfo`, `CursorPosition`, `RemoteCursor`, `UserPresence`, `SharedWindowInfo`, `FollowState`, `CollaborationTransport`, `CollaborationSDK`)
- [x] Collaboration engine package (`@archbase/collaboration`) with Yjs CRDT
- [x] Transport abstraction: `AbstractTransport`, `WebSocketTransport`, `WebRTCTransport` (data channels)
- [x] Services: `CursorService` (30fps broadcast), `PresenceService` (idle detection), `WindowSyncService` (Zustand ↔ Yjs bidirectional sync), `FollowService` (follow mode)
- [x] `CollaborationClient` orchestrator with lifecycle management
- [x] `useCollaborationStore` Zustand store (connected, users, cursors, shared windows, follow state)
- [x] SDK integration: `createCollaborationService()`, `useCollaboration()` hook
- [x] UI components: `CursorOverlay` (SVG cursors), `PresencePanel` (online users), `CollaborationBadge` (window sharing indicator)
- [x] Reference server (`@archbase/collaboration-server`) with `ws` + Yjs sync + WebRTC signaling
- [x] `'collaboration'` permission added to Permission union and ALL_PERMISSIONS
- [x] Window header context menu: "Share Window" / "Stop Sharing"
- [x] CSS variables for collaboration (dark + light themes)
- [x] Exponential backoff reconnection (1s → 2s → 4s → ... → 30s max)
- [x] Binary TLV encoding for efficient WebSocket messages
- [x] 68 new tests (54 collaboration + 14 server)

### 6.5 Backlog (Planned)

### Plugin Marketplace
- [ ] Searchable catalog
- [ ] Ratings & reviews
- [ ] One-click install
- [ ] Update notifications

### WebAssembly Apps (Phase 6.6) ✅
- [x] WASM module support (wasmLoader service, WasmApp component, 3rd rendering mode)
- [x] High-performance apps (draw-wasm canvas example app, port 3009)
- [x] Emscripten integration (standalone/emscripten/wasm-pack moduleTypes supported)

---

## Release Strategy

### v0.1.0 - Walking Skeleton (Semana 1)
- Proof of concept público
- Tag: `v0.1.0-alpha`

### v0.5.0 - Window Management (Semana 4)
- Window manager funcional
- Tag: `v0.5.0-alpha`

### v0.8.0 - Module Federation (Semana 6)
- Apps federadas funcionando
- Tag: `v0.8.0-beta`

### v1.0.0 - Production Ready (Semana 15)
- SDK publicado
- Docs completas
- Security audit passou
- Tag: `v1.0.0` 🎉

---

## Risk Management

### Riscos Técnicos

**R1: Module Federation pode ter bugs inesperados**
- Impacto: Alto
- Probabilidade: Média
- Mitigação: Walking skeleton valida MF cedo, fallback para Webpack se necessário

**R2: Performance abaixo de 60fps com 50 janelas**
- Impacto: Alto
- Probabilidade: Baixa
- Mitigação: Benchmarks contínuos, profiling, otimizações incrementais

**R3: Rspack pode ter breaking changes**
- Impacto: Médio
- Probabilidade: Baixa
- Mitigação: Pin versions, monitor changelogs, abstração de config

### Riscos de Produto

**R4: Mercado pode não adotar**
- Impacto: Alto
- Probabilidade: Média
- Mitigação: Validar early com beta users, demos públicas, marketing agressivo

**R5: Competição (alguém lança similar)**
- Impacto: Médio
- Probabilidade: Baixa
- Mitigação: Move fast, open source = comunidade, diferencial AI

---

## Tracking

**GitHub Projects**: https://github.com/archbase-workspace/archbase-workspace/projects/1

**Milestones**:
- [x] Fase 0 - Walking Skeleton
- [x] Fase 1 - Window Management
- [x] Fase 2 - Module Federation
- [x] Fase 3 - Desktop Environment
- [x] Fase 4 - Plugin System & SDK
- [x] Fase 5 - Isolation & Security
- [ ] Fase 6 - Features Avançadas (AI Assistant done, remaining items planned)

**Weekly Updates**: Todo sexta-feira, post no GitHub Discussions

---

**Next Review**: 2025-02-22 (após Fase 0 completar)
