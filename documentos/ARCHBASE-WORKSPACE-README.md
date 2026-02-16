# Archbase Workspace

> **Status**: 🚀 Phase 6 In Progress (Phases 0-5 Complete)
> **Version**: 1.0.0-beta
> **Last Updated**: 2026-02-16
> **Note**: This is the original concept document. See the root [README.md](../README.md) for the current project documentation.

Uma biblioteca React para criar workspaces multi-app com window management profissional e suporte a microfrontends federados. Organize múltiplos sistemas (React, Angular, Vue, Svelte, Web Components) em um ambiente unificado.

---

## 🎯 Vision

Permitir que empresas unifiquem múltiplos sistemas (independente de framework) em um workspace profissional com:

- ✅ **Window Management** - Drag, resize, minimize, maximize, snap
- ✅ **Multi-Framework** - React, Angular, Vue, Svelte, Web Components, jQuery
- ✅ **Module Federation** - Apps federadas independentemente deployáveis
- ✅ **Plugin System** - Third-party apps se integram via SDK
- ✅ **Performance** - 50+ janelas a 60fps
- ✅ **Acessibilidade** - WCAG 2.1 AA compliant

**Diferencial**: Único workspace que combina window management + Module Federation 2.0 + VSCode-inspired plugin architecture + framework-agnostic.

**Caso de uso típico**: Empresa tem ERP legado (Angular), CRM novo (React), BI Dashboard (Vue) → Archbase Workspace unifica tudo em uma interface profissional.

---

## 📚 Documentação

### Quick Links

| Doc | Descrição |
|-----|-----------|
| [🗺️ Roadmap](ROADMAP.md) | Timeline completo (15 semanas) |
| [🤝 Contributing](CONTRIBUTING.md) | Como contribuir (ADRs, RFCs) |
| [📋 ADRs](docs/adr/README.md) | Architecture Decision Records |
| [💬 RFCs](docs/rfcs/README.md) | Request for Comments |

### Decisões Arquiteturais (ADRs)

| ADR | Título | Status |
|-----|--------|--------|
| [001](docs/adr/0001-rspack-build-system.md) | Rspack como Build System | ✅ Aceito |
| [002](docs/adr/0002-monorepo-structure.md) | Monorepo com pnpm + Turborepo | ✅ Aceito |
| [003](docs/adr/0003-state-management.md) | Zustand + Jotai para State | ✅ Aceito |
| [004](docs/adr/0004-pointer-events-drag-resize.md) | Pointer Events para Drag/Resize | ✅ Aceito |

### Propostas de Features (RFCs)

| RFC | Título | Status |
|-----|--------|--------|
| [001](docs/rfcs/0001-window-service-api.md) | Window Service API Design | 💬 Discussion |
| [002](docs/rfcs/0002-app-manifest-structure.md) | App Manifest Structure | 💬 Discussion |

---

## 🏗️ Tech Stack (Decisões Aprovadas)

### Build & Tooling
- **Rspack** + `@module-federation/enhanced` - Build system 10x faster que Webpack
- **pnpm workspaces** + **Turborepo** - Monorepo com cache inteligente
- **TypeScript** - Strict mode, types auto-gerados para MF

### State Management
- **Zustand** (~2KB) - State global do desktop shell
- **Jotai** (~6.3KB) - State local de apps federadas

### Styling
- **Tailwind CSS** (desktop shell) - Utility-first com prefix `rx-`
- **CSS Modules** (apps) - Scoping automático

### Testing
- **Vitest** - Unit tests (ESM native, 10x faster que Jest)
- **Playwright** - E2E tests (drag & drop, multi-window)
- **Chromatic** - Visual regression via Storybook

### Docs
- **Starlight** (Astro) - Documentação com search built-in

---

## 📅 Roadmap (15 semanas)

```
Fase 0: Walking Skeleton       [1 semana]   ████████░░░░░░░░░░
Fase 1: Window Management      [3 semanas]  ░░░░░░░░████████████░░
Fase 2: Module Federation      [2 semanas]  ░░░░░░░░░░░░░░░░░░░░████████
Fase 3: Desktop Environment    [3 semanas]  ░░░░░░░░░░░░░░░░░░░░░░░░████████████
Fase 4: Plugin System & SDK    [4 semanas]  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████
Fase 5: Isolamento & Segurança [2 semanas]  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████
```

**[Ver roadmap completo](ROADMAP.md)** com tasks detalhadas de cada fase.

---

## 🚀 Quick Start (Futuro)

```bash
# Criar nova app
npx @archbase/workspace-create-app my-calculator

# Desenvolver
cd my-calculator
pnpm dev

# Build
pnpm build

# Deploy
pnpm deploy
```

**Status atual**: SDK ainda não publicado. Projeto em fase de planejamento.

---

## 🏛️ Arquitetura

### Service-Oriented Design (VSCode-inspired)

```
Desktop Shell (Host MF)
├── Window Service        # open/close, focus, z-ordering
├── App Service           # registry, bundle loading
├── Event Service         # pub/sub, IPC
├── State Service         # Zustand global + Jotai per-app
├── Storage Service       # localStorage/IndexedDB scoped
├── Notification Service  # toasts, notification center
└── Theme Service         # CSS custom properties
    ↓
Module Federation Runtime (@module-federation/enhanced)
    ↓
App A | App B | App C | App N (federated remotes)
```

**Isolation**:
- First-party apps: Shadow DOM (CSS isolation)
- Third-party apps: Sandboxed iframe + postMessage
- Permissions: Manifest-declared, runtime-gated

---

## 📦 Monorepo Structure (Planejado)

```
archbase-workspace/
├── packages/
│   ├── core/          # Desktop shell, window manager
│   ├── sdk/           # Plugin SDK (@archbase/workspace-sdk)
│   ├── types/         # Shared TypeScript types
│   ├── ui/            # Component library
│   ├── state/         # State utilities (Zustand stores)
│   └── cli/           # CLI tool (@archbase/workspace-cli)
├── apps/
│   ├── desktop/       # Host application
│   └── example-apps/  # Calculator, Notes, Terminal, etc
├── docs/
│   ├── adr/           # Architecture Decision Records
│   └── rfcs/          # Request for Comments
├── ROADMAP.md         # Timeline e milestones
├── CONTRIBUTING.md    # Como contribuir
└── pnpm-workspace.yaml
```

---

## 💡 Casos de Uso

### 🌟 Unificação Multi-Framework (Principal Caso de Uso)
**Cenário**: Empresa com sistemas em tecnologias diferentes
```
Archbase Workspace
├── ERP Legado (Angular 14)
├── CRM Novo (React 18)
├── BI Dashboard (Vue 3)
├── Admin Tools (Svelte)
└── Sistema Antigo (jQuery/Web Components)
```
**Resultado**: Todos sistemas em 1 interface com window management profissional

### Enterprise Internal Tools
Consolidar HR, finance, ops em single platform com SSO/RBAC

### Multi-app SaaS
Cada "app" é MFE independente, deployado separadamente

### Low-code Platforms
Desktop shell hosting drag-and-drop + coded apps

### Healthcare
Patient views, PACS viewers, EHR (HIPAA-compliant)

### Trading Platforms
Multi-view real-time data dashboards

---

## 🎨 Design Principles

1. **Developer Experience First**
   - Zero boilerplate (Zustand, Jotai)
   - Type-safe (auto-generated types via MF 2.0)
   - Fast builds (Rspack 10x faster)

2. **Performance by Default**
   - GPU acceleration (`transform: translate3d()`)
   - Virtualization (minimized windows removed from DOM)
   - Lazy loading (activation events)

3. **Security Conscious**
   - Permission system
   - CSP headers
   - Sandbox mode for untrusted apps

4. **Accessible**
   - WCAG 2.1 AA
   - Keyboard navigation
   - Screen reader support

---

## 🤝 Como Contribuir

Leia [CONTRIBUTING.md](CONTRIBUTING.md) para:
- Como criar ADRs (decisões arquiteturais)
- Como criar RFCs (propostas de features)
- Code style guidelines
- Testing guidelines
- PR review checklist

**Quick start**:

```bash
# 1. Fork e clone
git clone https://github.com/SEU-USERNAME/archbase-workspace

# 2. Instale deps
pnpm install

# 3. Crie branch
git checkout -b feature/minha-feature

# 4. Faça mudanças
# 5. Commit (conventional commits)
git commit -m "feat: minha feature"

# 6. Push e abra PR
```

---

## 📊 Status do Projeto

### Fase Atual: **Fase 0 - Walking Skeleton** (Semana 1)

- [x] ADRs escritos (Rspack, Monorepo, State, Pointer Events)
- [x] RFCs escritos (Window Service, App Manifest)
- [ ] Setup monorepo
- [ ] Rspack configurado
- [ ] 1 janela hardcoded renderizando
- [ ] 1 app federada "Hello World" carregando
- [ ] Deploy no Vercel

**Progresso**: 30% completo

---

## 🔗 Links Úteis

- **GitHub**: https://github.com/archbase-workspace/archbase-workspace
- **Docs**: https://docs.archbase-workspace.dev (futuro)
- **Discord**: https://discord.gg/archbase-workspace (futuro)
- **npm**: https://www.npmjs.com/org/archbase-workspace (futuro)

---

## 📝 Licença

MIT License - See [LICENSE](LICENSE) for details

---

## 🙏 Agradecimentos

Inspiração de projetos:
- [Puter](https://github.com/HeyPuter/puter) - Complete web desktop
- [daedalOS](https://github.com/DustinBrett/daedalOS) - Next.js desktop
- [ProzillaOS](https://github.com/Prozilla/ProzillaOS) - Composable React API
- [VSCode](https://github.com/microsoft/vscode) - Extension architecture
- [Piral](https://github.com/smapiot/piral) - Microfrontend framework

---

**Mantido por**: Edson (CTO/Founder IntegrAllTech)  
**Última atualização**: 2025-02-15
