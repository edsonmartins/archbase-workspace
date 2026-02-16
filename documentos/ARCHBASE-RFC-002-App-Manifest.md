# RFC-002: App Manifest Structure

**Status**: Draft → Discussion (2025-02-15)

**Author**: Edson (CTO/Founder)

**Related**: RFC-001 (Window Service API), Research sobre VSCode extensions e Piral pilets

---

## Summary

Proposta de schema JSON para manifestos de apps federadas. Manifesto declara: metadados (nome, versão), entrypoint MF, configuração de janela default, permissões, contribution points (menu items, widgets), e activation events (lazy loading).

---

## Motivation

### Problema

Desktop shell precisa conhecer apps antes de carregar código:
- **Discovery**: Quais apps estão disponíveis?
- **Registry**: Onde está o remoteEntry.js de cada app?
- **Configuração**: Tamanho padrão da janela, ícone, etc
- **Segurança**: Que permissões app precisa?
- **Lazy loading**: Quando carregar bundle (activation events)?

Sem manifesto:
```typescript
// Hardcoded - não escala
const apps = [
  { id: 'calc', url: 'http://localhost:3001/remoteEntry.js' },
  { id: 'notes', url: 'http://localhost:3002/remoteEntry.js' }
];
```

Com manifesto:
```json
// apps/calculator/manifest.json - Auto-discovered
{
  "id": "com.example.calculator",
  "name": "Calculator",
  "remoteEntry": "./dist/remoteEntry.js"
}
```

### Inspiration

Estudamos 3 sistemas maduros:

#### 1. VSCode Extension Manifest
```json
{
  "name": "vscode-prettier",
  "displayName": "Prettier",
  "activationEvents": ["onLanguage:javascript"],
  "contributes": {
    "commands": [{ "command": "prettier.format", "title": "Format Document" }]
  }
}
```
- ✅ Activation events para lazy loading
- ✅ Contribution points declarativos
- ✅ Schema validation com JSON Schema

#### 2. Piral Pilet Manifest
```json
{
  "name": "@sample/pilet",
  "version": "1.0.0",
  "pilets": {
    "externals": ["react", "react-dom"],
    "scripts": { "start": "pilet debug", "build": "pilet build" }
  }
}
```
- ✅ Gerenciamento de shared dependencies
- ✅ CLI integration
- ⚠️ Muito focado em Piral Cloud

#### 3. Chrome Extension Manifest V3
```json
{
  "manifest_version": 3,
  "permissions": ["storage", "notifications"],
  "action": { "default_popup": "popup.html" }
}
```
- ✅ Sistema de permissões granular
- ✅ Separation of concerns (background, popup, content)

---

## Detailed Design

### Manifest Schema (v1)

```json
{
  "$schema": "https://archbase-workspace.dev/schemas/manifest.v1.json",
  
  // === REQUIRED ===
  "id": "com.example.calculator",
  "name": "Calculator",
  "version": "1.0.0",
  "entrypoint": "./src/App.tsx",
  "remoteEntry": "./dist/remoteEntry.js",
  
  // === METADATA ===
  "displayName": "Scientific Calculator",
  "description": "A powerful calculator with scientific functions",
  "author": {
    "name": "John Doe",
    "email": "john@example.com",
    "url": "https://example.com"
  },
  "license": "MIT",
  "homepage": "https://example.com/calculator",
  "repository": {
    "type": "git",
    "url": "https://github.com/example/calculator"
  },
  "keywords": ["calculator", "math", "science"],
  "icon": "./assets/icon.svg",
  "screenshots": ["./assets/screenshot1.png"],
  
  // === WINDOW CONFIGURATION ===
  "window": {
    "defaultWidth": 320,
    "defaultHeight": 480,
    "minWidth": 280,
    "minHeight": 400,
    "maxWidth": 600,
    "maxHeight": 800,
    "resizable": true,
    "maximizable": true,
    "minimizable": true,
    "closable": true,
    "alwaysOnTop": false
  },
  
  // === MODULE FEDERATION ===
  "shared": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@archbase/workspace-sdk": "*"
  },
  "exposes": {
    "./App": "./src/App.tsx",
    "./MiniWidget": "./src/MiniWidget.tsx"
  },
  
  // === PERMISSIONS ===
  "permissions": [
    "notifications",
    "storage",
    "clipboard.read",
    "clipboard.write"
  ],
  
  // === CONTRIBUTION POINTS ===
  "contributes": {
    "commands": [
      {
        "id": "calculator.open",
        "title": "Open Calculator",
        "icon": "calculator",
        "keybinding": "Ctrl+Alt+C"
      },
      {
        "id": "calculator.clearHistory",
        "title": "Clear Calculator History"
      }
    ],
    "menus": {
      "application": [
        {
          "command": "calculator.open",
          "group": "tools",
          "when": "editorFocus"
        }
      ],
      "context": [
        {
          "command": "calculator.calculate",
          "when": "selectionType == number",
          "group": "calculation"
        }
      ]
    },
    "widgets": [
      {
        "id": "mini-calculator",
        "title": "Mini Calculator",
        "component": "./MiniWidget",
        "defaultLocation": "statusBar"
      }
    ],
    "settings": [
      {
        "key": "calculator.precision",
        "type": "number",
        "default": 10,
        "description": "Number of decimal places for calculations"
      }
    ]
  },
  
  // === ACTIVATION EVENTS (lazy loading) ===
  "activationEvents": [
    "onDesktopReady",
    "onCommand:calculator.open",
    "onFileType:csv",
    "onShortcut:Ctrl+Alt+C"
  ],
  
  // === LIFECYCLE ===
  "lifecycle": {
    "singleton": true,
    "background": false,
    "preload": false,
    "autoStart": false
  },
  
  // === DEPENDENCIES (outras apps) ===
  "dependencies": {
    "com.example.spreadsheet": "^2.0.0"
  },
  
  // === PLATFORM ===
  "platform": {
    "os": ["windows", "macos", "linux"],
    "browser": ["chrome", "edge", "firefox"],
    "minVersion": "1.0.0"
  }
}
```

### TypeScript Definitions

```typescript
// packages/types/src/manifest.ts

export interface AppManifest {
  // Required
  id: string;
  name: string;
  version: string;
  entrypoint: string;
  remoteEntry: string;
  
  // Metadata (optional)
  displayName?: string;
  description?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  license?: string;
  homepage?: string;
  repository?: {
    type: 'git' | 'svn';
    url: string;
  };
  keywords?: string[];
  icon?: string;
  screenshots?: string[];
  
  // Window config
  window?: WindowConfig;
  
  // Module Federation
  shared?: Record<string, string>;
  exposes?: Record<string, string>;
  
  // Permissions
  permissions?: Permission[];
  
  // Contributions
  contributes?: ContributionPoints;
  
  // Activation
  activationEvents?: ActivationEvent[];
  
  // Lifecycle
  lifecycle?: LifecycleConfig;
  
  // Dependencies
  dependencies?: Record<string, string>;
  
  // Platform
  platform?: PlatformConfig;
}

export interface WindowConfig {
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  maximizable?: boolean;
  minimizable?: boolean;
  closable?: boolean;
  alwaysOnTop?: boolean;
}

export type Permission =
  | 'notifications'
  | 'storage'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'filesystem.read'
  | 'filesystem.write'
  | 'network'
  | 'camera'
  | 'microphone';

export interface ContributionPoints {
  commands?: Command[];
  menus?: MenuContributions;
  widgets?: Widget[];
  settings?: Setting[];
}

export interface Command {
  id: string;
  title: string;
  icon?: string;
  keybinding?: string;
  category?: string;
}

export interface MenuContributions {
  application?: MenuItem[];
  context?: MenuItem[];
  window?: MenuItem[];
}

export interface MenuItem {
  command: string;
  group?: string;
  when?: string; // Expression like "editorFocus && !readOnly"
}

export interface Widget {
  id: string;
  title: string;
  component: string; // Module Federation exposed path
  defaultLocation: 'statusBar' | 'sidebar' | 'panel';
}

export type ActivationEvent =
  | 'onDesktopReady'
  | `onCommand:${string}`
  | `onFileType:${string}`
  | `onShortcut:${string}`
  | `onSchedule:${string}`;

export interface LifecycleConfig {
  singleton?: boolean;
  background?: boolean;
  preload?: boolean;
  autoStart?: boolean;
}

export interface PlatformConfig {
  os?: ('windows' | 'macos' | 'linux')[];
  browser?: ('chrome' | 'edge' | 'firefox' | 'safari')[];
  minVersion?: string;
}
```

### Validation with Zod

```typescript
// packages/core/src/schemas/manifest.ts
import { z } from 'zod';

const windowConfigSchema = z.object({
  defaultWidth: z.number().positive().optional(),
  defaultHeight: z.number().positive().optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  resizable: z.boolean().optional(),
  maximizable: z.boolean().optional(),
  minimizable: z.boolean().optional(),
  closable: z.boolean().optional(),
  alwaysOnTop: z.boolean().optional()
});

const manifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/), // Reverse domain notation
  name: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semver
  entrypoint: z.string(),
  remoteEntry: z.string().url(),
  
  displayName: z.string().optional(),
  description: z.string().max(500).optional(),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional()
  }).optional(),
  
  window: windowConfigSchema.optional(),
  
  shared: z.record(z.string()).optional(),
  exposes: z.record(z.string()).optional(),
  
  permissions: z.array(z.enum([
    'notifications',
    'storage',
    'clipboard.read',
    'clipboard.write',
    'filesystem.read',
    'filesystem.write',
    'network',
    'camera',
    'microphone'
  ])).optional(),
  
  // ... resto do schema
});

export function validateManifest(manifest: unknown): AppManifest {
  return manifestSchema.parse(manifest);
}
```

---

## Implementation Strategy

### Phase 1: Discovery

```typescript
// packages/core/src/services/AppRegistry.ts
export class AppRegistry {
  private manifests = new Map<string, AppManifest>();
  
  async discover(sources: ManifestSource[]) {
    for (const source of sources) {
      const manifest = await this.loadManifest(source);
      
      // Validate
      const validated = validateManifest(manifest);
      
      // Check platform compatibility
      if (!this.isPlatformCompatible(validated)) {
        console.warn(`App ${validated.id} not compatible with platform`);
        continue;
      }
      
      this.manifests.set(validated.id, validated);
    }
  }
  
  private async loadManifest(source: ManifestSource): Promise<unknown> {
    if (source.type === 'url') {
      const response = await fetch(source.url);
      return response.json();
    } else if (source.type === 'file') {
      // Local development
      const module = await import(source.path);
      return module.default;
    }
  }
  
  get(id: string): AppManifest | undefined {
    return this.manifests.get(id);
  }
  
  getAll(): AppManifest[] {
    return Array.from(this.manifests.values());
  }
}

// Usage
const registry = new AppRegistry();
await registry.discover([
  { type: 'url', url: 'https://cdn.example.com/calculator/manifest.json' },
  { type: 'file', path: './apps/notes/manifest.json' }
]);
```

### Phase 2: Activation Events

```typescript
// packages/core/src/services/ActivationService.ts
export class ActivationService {
  private activatedApps = new Set<string>();
  
  async processEvent(event: string) {
    const registry = useAppRegistry();
    const apps = registry.getAll();
    
    for (const app of apps) {
      if (!app.activationEvents) continue;
      
      const shouldActivate = app.activationEvents.some(pattern => {
        return this.matchesPattern(event, pattern);
      });
      
      if (shouldActivate && !this.activatedApps.has(app.id)) {
        await this.activateApp(app);
      }
    }
  }
  
  private async activateApp(app: AppManifest) {
    console.log(`Activating app: ${app.id}`);
    
    // Load MF remote
    await loadRemoteModule({
      url: app.remoteEntry,
      scope: app.id,
      module: './App'
    });
    
    this.activatedApps.add(app.id);
    
    // Register contributions (commands, menus)
    this.registerContributions(app);
  }
  
  private matchesPattern(event: string, pattern: ActivationEvent): boolean {
    if (pattern === 'onDesktopReady' && event === 'desktop:ready') {
      return true;
    }
    
    if (pattern.startsWith('onCommand:')) {
      const commandId = pattern.slice('onCommand:'.length);
      return event === `command:${commandId}`;
    }
    
    if (pattern.startsWith('onFileType:')) {
      const fileType = pattern.slice('onFileType:'.length);
      return event.startsWith(`file:open:${fileType}`);
    }
    
    return false;
  }
}
```

### Phase 3: Contribution Points

```typescript
// Quando app ativa, registra contribuições
function registerContributions(app: AppManifest) {
  if (app.contributes?.commands) {
    for (const command of app.contributes.commands) {
      commandRegistry.register({
        id: command.id,
        title: command.title,
        handler: async () => {
          // Carrega app se não carregada
          await ensureAppLoaded(app.id);
          
          // Executa comando
          const module = await getRemoteModule(app.id, './App');
          module.executeCommand?.(command.id);
        }
      });
    }
  }
  
  if (app.contributes?.menus) {
    // Registra menu items que aparecem no UI
    menuRegistry.registerItems(app.contributes.menus);
  }
  
  if (app.contributes?.widgets) {
    // Widgets aparecem em statusBar, sidebar, etc
    widgetRegistry.registerWidgets(app.contributes.widgets);
  }
}
```

---

## Drawbacks

1. **Schema complexo** - Muitos campos opcionais
   - Mitigação: Docs com exemplos progressivos (simple → advanced)

2. **Validação runtime** - Overhead ao carregar manifests
   - Mitigação: Cache validados, validação incremental

3. **Versioning** - Schema vai evoluir (breaking changes?)
   - Mitigação: `$schema` URL com versão, backward compatibility

---

## Alternatives Considered

### 1. package.json Only

```json
{
  "name": "@archbase/workspace-calculator",
  "reactOS": {
    "window": { ... },
    "permissions": [ ... ]
  }
}
```

- ✅ Arquivo único
- ❌ Mistura concerns (npm vs app metadata)
- ❌ package.json pode ficar gigante

### 2. Code-based Config

```typescript
export default {
  id: 'calculator',
  window: { ... }
};
```

- ✅ TypeScript validation
- ❌ Precisa executar código para ler config
- ❌ Não funciona para discovery pre-load

### 3. JSON Manifest (escolhido)

- ✅ Parseable sem executar código
- ✅ JSON Schema validation
- ✅ Separação clara de concerns

---

## Unresolved Questions

1. **Manifest URL vs File path?**
   - Dev: Local file path
   - Prod: CDN URL
   - **Proposta**: Suportar ambos, detectar automaticamente

2. **Versioning de manifest schema?**
   - `$schema: "v1.json"` vs `$schema: "v2.json"`
   - **Proposta**: URL versionada + deprecation warnings

3. **Nested apps?**
   - App pode depender de outra app (dependencies field)
   - **Proposta**: App registry resolve dependencies recursivamente

4. **Manifest updates?**
   - App atualiza, manifest muda
   - **Proposta**: Desktop check versão periodicamente, notifica update disponível

---

## Success Metrics

- [ ] 100% das apps usam manifest v1
- [ ] Zero runtime errors de manifest inválido (caught by validation)
- [ ] < 50ms para load + validate manifest
- [ ] Docs completas com 10+ examples

---

## Migration Path

Fase atual (hardcoded):
```typescript
const apps = [{ id: 'calc', url: '...' }];
```

Fase 1 (manifests básicos):
```json
{ "id": "calc", "name": "Calculator", "remoteEntry": "..." }
```

Fase 2 (contribution points):
```json
{ "contributes": { "commands": [...] } }
```

Fase 3 (activation events):
```json
{ "activationEvents": ["onCommand:calc.open"] }
```

---

**Discussion Period**: 2025-02-15 to 2025-02-22

**Decision Deadline**: 2025-02-23

**Related RFCs**: RFC-001 (Window Service), RFC-003 (Permission System - TBD)
