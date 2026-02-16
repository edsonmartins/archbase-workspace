# RFC-001: Window Service API Design

**Status**: Draft → Discussion (2025-02-15)

**Author**: Edson (CTO/Founder)

**Shepherd**: TBD (aguardando formação de core team)

---

## Summary

Proposta de API para o Window Service, componente core do Archbase Workspace que gerencia lifecycle completo de janelas (create, focus, minimize, maximize, close). API deve ser simples para casos comuns mas extensível para casos avançados.

---

## Motivation

### Problema

Atualmente não existe interface clara entre:
- Apps federadas (querem abrir janelas)
- Desktop shell (gerencia janelas)
- Window manager (renderiza UI)

Precisamos de contrato bem definido que:
1. **Apps possam invocar** sem conhecer internals
2. **Desktop possa estender** sem quebrar apps
3. **TypeScript possa validar** em compile-time
4. **Testes possam mockar** facilmente

### Casos de Uso

```typescript
// UC1: App abre nova janela
const windowId = windowService.open({
  appId: 'calculator',
  title: 'Calculator',
  width: 320,
  height: 480
});

// UC2: App se auto-fecha
windowService.close(windowId);

// UC3: App reage a focus
windowService.onFocus(windowId, () => {
  console.log('Window focused');
});

// UC4: Desktop shell fecha todas as janelas de um app
windowService.closeByAppId('calculator');

// UC5: Usuário minimiza janela via taskbar
windowService.minimize(windowId);

// UC6: Usuário maximiza janela via double-click no header
windowService.maximize(windowId);
```

---

## Detailed Design

### Core Interface

```typescript
// packages/core/src/services/WindowService.ts

export interface WindowOptions {
  appId: string;
  title: string;
  
  // Dimensões (optional, defaults via manifest)
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  
  // Posição (optional, auto-center se omitido)
  x?: number;
  y?: number;
  
  // Comportamento
  resizable?: boolean;
  maximizable?: boolean;
  minimizable?: boolean;
  closable?: boolean;
  
  // State inicial
  state?: 'normal' | 'minimized' | 'maximized';
  
  // Props passadas para a app
  props?: Record<string, unknown>;
  
  // Metadata
  icon?: string;
  className?: string;
}

export interface Window {
  id: string;
  appId: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  constraints: {
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
  };
  zIndex: number;
  state: 'normal' | 'minimized' | 'maximized';
  flags: {
    resizable: boolean;
    maximizable: boolean;
    minimizable: boolean;
    closable: boolean;
  };
  props: Record<string, unknown>;
  metadata: {
    icon?: string;
    className?: string;
    createdAt: number;
    focusedAt: number;
  };
}

export interface WindowService {
  // CRUD
  open(options: WindowOptions): string;
  close(id: string): void;
  closeByAppId(appId: string): void;
  closeAll(): void;
  
  // State management
  minimize(id: string): void;
  maximize(id: string): void;
  restore(id: string): void;
  toggleMaximize(id: string): void;
  
  // Focus
  focus(id: string): void;
  focusNext(): void;
  focusPrevious(): void;
  
  // Position & Size
  setPosition(id: string, position: { x: number; y: number }): void;
  setSize(id: string, size: { width: number; height: number }): void;
  setBounds(id: string, bounds: { x: number; y: number; width: number; height: number }): void;
  center(id: string): void;
  
  // Queries
  get(id: string): Window | undefined;
  getByAppId(appId: string): Window[];
  getAll(): Window[];
  getFocused(): Window | undefined;
  exists(id: string): boolean;
  
  // Events
  onOpen(handler: (window: Window) => void): () => void;
  onClose(handler: (id: string) => void): () => void;
  onFocus(id: string, handler: () => void): () => void;
  onBlur(id: string, handler: () => void): () => void;
  onStateChange(id: string, handler: (state: Window['state']) => void): () => void;
  
  // Bulk operations
  minimizeAll(): void;
  cascadeWindows(): void;
  tileWindows(layout: 'horizontal' | 'vertical' | 'grid'): void;
}
```

### Implementation (Zustand-backed)

```typescript
// packages/core/src/services/windowService.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface WindowServiceState {
  windows: Map<string, Window>;
  focusStack: string[];
}

const useWindowServiceStore = create<WindowServiceState>()(
  subscribeWithSelector((set, get) => ({
    windows: new Map(),
    focusStack: []
  }))
);

export const windowService: WindowService = {
  open(options) {
    const id = crypto.randomUUID();
    
    // Merge com defaults do manifest
    const manifest = appRegistry.get(options.appId);
    const mergedOptions = {
      ...manifest?.window,
      ...options
    };
    
    // Auto-center se não especificado
    const position = options.x !== undefined && options.y !== undefined
      ? { x: options.x, y: options.y }
      : getCenterPosition(mergedOptions.width ?? 800, mergedOptions.height ?? 600);
    
    const window: Window = {
      id,
      appId: options.appId,
      title: options.title,
      position,
      size: {
        width: mergedOptions.width ?? 800,
        height: mergedOptions.height ?? 600
      },
      constraints: {
        minWidth: mergedOptions.minWidth ?? 200,
        minHeight: mergedOptions.minHeight ?? 150,
        maxWidth: mergedOptions.maxWidth ?? Infinity,
        maxHeight: mergedOptions.maxHeight ?? Infinity
      },
      zIndex: 0, // Atualizado abaixo
      state: options.state ?? 'normal',
      flags: {
        resizable: mergedOptions.resizable ?? true,
        maximizable: mergedOptions.maximizable ?? true,
        minimizable: mergedOptions.minimizable ?? true,
        closable: mergedOptions.closable ?? true
      },
      props: options.props ?? {},
      metadata: {
        icon: options.icon,
        className: options.className,
        createdAt: Date.now(),
        focusedAt: Date.now()
      }
    };
    
    useWindowServiceStore.setState((state) => {
      const windows = new Map(state.windows);
      windows.set(id, window);
      
      const focusStack = [...state.focusStack, id];
      
      // Atualiza z-indexes
      focusStack.forEach((wid, index) => {
        const w = windows.get(wid);
        if (w) {
          windows.set(wid, { ...w, zIndex: index });
        }
      });
      
      return { windows, focusStack };
    });
    
    // Dispara evento
    openHandlers.forEach(h => h(window));
    
    return id;
  },
  
  close(id) {
    const window = useWindowServiceStore.getState().windows.get(id);
    if (!window) return;
    
    // Check if closable
    if (!window.flags.closable) {
      console.warn(`Window ${id} is not closable`);
      return;
    }
    
    // Cleanup subscriptions
    cleanupWindowSubscriptions(id);
    
    useWindowServiceStore.setState((state) => {
      const windows = new Map(state.windows);
      windows.delete(id);
      
      const focusStack = state.focusStack.filter(wid => wid !== id);
      
      return { windows, focusStack };
    });
    
    // Dispara evento
    closeHandlers.forEach(h => h(id));
  },
  
  focus(id) {
    const window = useWindowServiceStore.getState().windows.get(id);
    if (!window) return;
    
    // Se minimizada, restaura
    if (window.state === 'minimized') {
      this.restore(id);
    }
    
    useWindowServiceStore.setState((state) => {
      const focusStack = state.focusStack.filter(wid => wid !== id);
      focusStack.push(id); // Move para topo
      
      const windows = new Map(state.windows);
      
      // Atualiza z-indexes e focusedAt
      focusStack.forEach((wid, index) => {
        const w = windows.get(wid);
        if (w) {
          windows.set(wid, {
            ...w,
            zIndex: index,
            metadata: {
              ...w.metadata,
              focusedAt: wid === id ? Date.now() : w.metadata.focusedAt
            }
          });
        }
      });
      
      return { windows, focusStack };
    });
  },
  
  maximize(id) {
    const window = useWindowServiceStore.getState().windows.get(id);
    if (!window || !window.flags.maximizable) return;
    
    // Salva bounds anteriores (para restore)
    const previousBounds = {
      position: window.position,
      size: window.size
    };
    
    useWindowServiceStore.setState((state) => {
      const windows = new Map(state.windows);
      windows.set(id, {
        ...window,
        state: 'maximized',
        position: { x: 0, y: 0 },
        size: {
          width: window.innerWidth,
          height: window.innerHeight - TASKBAR_HEIGHT
        },
        metadata: {
          ...window.metadata,
          previousBounds // Metadado interno
        }
      });
      
      return { windows };
    });
  },
  
  // ... outras implementações
  
  // Events com cleanup automático
  onFocus(id, handler) {
    const unsubscribe = useWindowServiceStore.subscribe(
      (state) => state.focusStack[state.focusStack.length - 1],
      (focusedId) => {
        if (focusedId === id) {
          handler();
        }
      }
    );
    
    return unsubscribe;
  }
};
```

### React Integration

```tsx
// packages/core/src/hooks/useWindowService.ts
export function useWindowService() {
  return windowService; // Singleton
}

// Hook específico
export function useWindow(id: string) {
  return useWindowServiceStore((state) => state.windows.get(id));
}

export function useWindows() {
  return useWindowServiceStore((state) => Array.from(state.windows.values()));
}

export function useFocusedWindow() {
  const focusStack = useWindowServiceStore((state) => state.focusStack);
  const focusedId = focusStack[focusStack.length - 1];
  return useWindow(focusedId);
}

// Example usage in app
function MyApp() {
  const windowService = useWindowService();
  
  const openCalculator = () => {
    windowService.open({
      appId: 'calculator',
      title: 'Calculator'
    });
  };
  
  return <button onClick={openCalculator}>Open Calc</button>;
}
```

---

## Drawbacks

1. **API surface grande** - Muitos métodos aumenta complexidade
   - Mitigação: Documentar casos de uso comuns primeiro

2. **Mutabilidade do state** - Service altera state global
   - Mitigação: Zustand middleware com logging/devtools

3. **Sincronização** - Apps federadas podem ter state desatualizado
   - Mitigação: Hooks reativos (useWindow) sempre atualizados

---

## Alternatives Considered

### 1. Event-based API (pubsub)

```typescript
eventBus.emit('window:open', { appId: 'calc' });
eventBus.on('window:opened', (window) => {});
```

- ✅ Desacoplado
- ❌ Sem type safety
- ❌ Difícil de debugar
- ❌ Retorno assíncrono complicado

### 2. React Context-based

```tsx
const { openWindow } = useWindowContext();
```

- ✅ React-idiomático
- ❌ Context rerenders toda subtree
- ❌ Não funciona fora de React tree
- ❌ Difícil de compartilhar via MF

### 3. Imperative Service (escolhido)

```typescript
windowService.open({ ... });
```

- ✅ Type-safe
- ✅ Fácil de testar (mock)
- ✅ Funciona fora de React
- ✅ Compartilhável via MF (singleton)

---

## Adoption Strategy

### Fase 1: Core Implementation
- [ ] Implementar CRUD básico (open, close, focus)
- [ ] Zustand store com subscriptions
- [ ] Testes unitários

### Fase 2: State Management
- [ ] Minimize, maximize, restore
- [ ] Z-index e focus stack
- [ ] Testes de state transitions

### Fase 3: Advanced Features
- [ ] Tile, cascade layouts
- [ ] Snap to edges
- [ ] Keyboard shortcuts

### Fase 4: SDK Integration
- [ ] Publicar como `@archbase/workspace-window-service`
- [ ] Docs + examples
- [ ] Migration guide

---

## Unresolved Questions

1. **Como lidar com apps que abrem múltiplas janelas?**
   - Opção A: windowService rastreia por appId
   - Opção B: App gerencia seus próprios IDs
   - **Proposta**: windowService.getByAppId() + App decide o que fazer

2. **Timeout para close?**
   - Apps podem ter async cleanup (salvar dados)
   - **Proposta**: windowService.close() é síncrono, app usa onBeforeClose hook

3. **Janelas modais?**
   - Bloqueia input em outras janelas
   - **Proposta**: `options.modal = true` + focus trap

4. **Multi-monitor?**
   - Window pode estar em monitor secundário
   - **Proposta**: Fase futura, usar Window Management API (Chrome 100+)

---

## Success Metrics

- [ ] API usada em 5+ apps exemplo sem bugs
- [ ] 100% type coverage
- [ ] < 5ms para open/close operations
- [ ] Zero memory leaks em stress test (1000 open/close cycles)

---

## Prior Art

- **VSCode Window Service**: [code](https://github.com/microsoft/vscode/blob/main/src/vs/platform/windows/electron-main/windowsMainService.ts)
- **Electron BrowserWindow**: [docs](https://www.electronjs.org/docs/latest/api/browser-window)
- **Tauri Window**: [docs](https://tauri.app/v1/api/js/window/)

---

## Future Extensions

```typescript
// Multi-workspace support
windowService.moveToWorkspace(windowId, workspaceId);

// Window groups (tabs)
windowService.groupWindows([id1, id2, id3]);

// Picture-in-Picture mode
windowService.setPictureInPicture(id, true);

// Transparency
windowService.setOpacity(id, 0.8);
```

---

**Discussion Period**: 2025-02-15 to 2025-02-22 (7 dias)

**Decision Deadline**: 2025-02-23

**Feedback**: Comentar neste documento ou abrir issue no repo
