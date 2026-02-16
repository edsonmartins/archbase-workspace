# ADR-003: Zustand para State Global + Jotai para State per-App

**Status**: Aceito (2025-02-15)

**Decision Makers**: Edson (CTO/Founder)

---

## Contexto e Problema

Sistema precisa gerenciar estado em **duas camadas distintas**:

### 1. Estado Global (Desktop Shell)
- Lista de janelas abertas (windowsState)
- Z-index ordering (focusStack)
- App registry (manifestos carregados)
- Desktop settings (tema, locale)
- Notification queue

**Requisitos**:
- Compartilhado entre TODOS os componentes do shell
- Deve sobreviver a HMR (preservar estado durante dev)
- **CRÍTICO para MF**: Precisa ser singleton shareable entre host e remotes
- Performance em updates granulares (mover janela não rerenderiza taskbar)

### 2. Estado per-App (Apps Federadas)
- Estado local de cada app (ex: calculadora tem `currentValue`, `operation`)
- Deve ser isolado (App A não vê estado de App B)
- Pode ter atoms derivados complexos
- Suspense-friendly (loading states)
- Persistence opcional (salvar em localStorage por app)

**Requisitos**:
- Isolamento natural entre apps
- Suporte a Suspense
- Tree-shakeable (apps não usam pagam custo de global state)
- Storage integration fácil

### Alternativas Consideradas

#### 1. **Redux Toolkit (global) + Context (per-app)**
- ✅ Redux maduro, bem documentado
- ✅ DevTools excelente
- ❌ **11KB minified** (vs Zustand 2KB)
- ❌ Boilerplate (slices, thunks, selectors)
- ❌ Context não resolve Suspense naturalmente
- ❌ Performance: Context rerenderiza toda subtree

#### 2. **Zustand (global) + Zustand (per-app)**
- ✅ 2KB, zero boilerplate
- ✅ Stores vivem fora de React (sobrevivem HMR)
- ✅ Shareable via MF (module-level singleton)
- ⚠️ Per-app com Zustand funciona, mas não é idiomático
  - Precisaríamos criar store por app manualmente
  - Não tem Suspense nativo
  - Não tem derivations elegantes

#### 3. **Jotai (global) + Jotai (per-app)**
- ✅ Atomic model = isolamento natural
- ✅ Suspense first-class
- ✅ 6.3KB, derivations elegantes
- ❌ **Para global NÃO é ideal**: Atoms vivem dentro de React tree
  - Precisaria de Provider no root
  - Não sobrevive HMR tão bem quanto Zustand
  - Mais difícil de compartilhar via MF

#### 4. **Zustand (global) + Jotai (per-app)** ⭐ ESCOLHIDO
- ✅ **Best of both worlds**
- ✅ Zustand para estado que precisa viver fora de React
- ✅ Jotai para estado que se beneficia de modelo atômico
- ✅ Ambos leves (2KB + 6.3KB = 8.3KB total)
- ✅ Complementares, não conflitantes

---

## Decisão

**Usar Zustand para estado global do desktop shell e Jotai para estado interno de apps federadas.**

### Arquitetura

```
┌─────────────────────────────────────────────┐
│         Desktop Shell (Host MF)              │
│                                              │
│  ┌────────────────────────────────────┐     │
│  │   Zustand Stores (Global)          │     │
│  │                                     │     │
│  │  - windowsStore                    │     │
│  │  - appRegistryStore                │     │
│  │  - settingsStore                   │     │
│  │  - notificationsStore              │     │
│  └────────────────────────────────────┘     │
│           ↑ shared via MF                    │
└───────────┼──────────────────────────────────┘
            │
            │ import { useWindowsStore } from '@archbase/workspace-state'
            │
┌───────────┼──────────────────────────────────┐
│  App A    ↓                                   │
│  ┌──────────────────────┐                    │
│  │ Jotai Provider       │                    │
│  │                      │                    │
│  │  - valueAtom         │                    │
│  │  - operationAtom     │                    │
│  │  - resultAtom (derived)                  │
│  └──────────────────────┘                    │
└───────────────────────────────────────────────┘
            │
┌───────────┼──────────────────────────────────┐
│  App B    ↓                                   │
│  ┌──────────────────────┐                    │
│  │ Jotai Provider       │  ← Isolado de App A│
│  │                      │                    │
│  │  - notesAtom         │                    │
│  │  - tagsAtom          │                    │
│  └──────────────────────┘                    │
└───────────────────────────────────────────────┘
```

---

## Implementação Detalhada

### Zustand - Estado Global

```typescript
// packages/state/src/stores/windows.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Window {
  id: string;
  appId: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  state: 'normal' | 'minimized' | 'maximized';
}

interface WindowsState {
  windows: Map<string, Window>;
  focusStack: string[]; // IDs ordenados por z-index
  
  // Actions
  openWindow: (window: Omit<Window, 'id' | 'zIndex'>) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updatePosition: (id: string, position: { x: number; y: number }) => void;
  updateSize: (id: string, size: { width: number; height: number }) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
}

export const useWindowsStore = create<WindowsState>()(
  devtools(
    (set, get) => ({
      windows: new Map(),
      focusStack: [],
      
      openWindow: (windowData) => {
        const id = crypto.randomUUID();
        const { focusStack } = get();
        const zIndex = focusStack.length;
        
        set((state) => ({
          windows: new Map(state.windows).set(id, {
            ...windowData,
            id,
            zIndex,
            state: 'normal'
          }),
          focusStack: [...state.focusStack, id]
        }));
        
        return id;
      },
      
      closeWindow: (id) => {
        set((state) => {
          const windows = new Map(state.windows);
          windows.delete(id);
          
          return {
            windows,
            focusStack: state.focusStack.filter(wid => wid !== id)
          };
        });
      },
      
      focusWindow: (id) => {
        set((state) => {
          // Move ID para final do array (maior z-index)
          const focusStack = state.focusStack.filter(wid => wid !== id);
          focusStack.push(id);
          
          // Recalcula z-indexes
          const windows = new Map(state.windows);
          focusStack.forEach((wid, index) => {
            const window = windows.get(wid);
            if (window) {
              windows.set(wid, { ...window, zIndex: index });
            }
          });
          
          return { windows, focusStack };
        });
      },
      
      updatePosition: (id, position) => {
        set((state) => {
          const windows = new Map(state.windows);
          const window = windows.get(id);
          if (window) {
            windows.set(id, { ...window, position });
          }
          return { windows };
        });
      },
      
      // ... outras actions
    }),
    { name: 'WindowsStore' }
  )
);

// Selector granular para performance
export const useWindow = (id: string) => 
  useWindowsStore((state) => state.windows.get(id));

export const useFocusedWindowId = () =>
  useWindowsStore((state) => state.focusStack[state.focusStack.length - 1]);
```

**Por que Zustand aqui?**
1. Store vive em **module scope** (fora de React tree)
2. Sobrevive a HMR (preserva windows abertas durante dev)
3. Pode ser importado por qualquer componente (host ou remote)
4. Seletores granulares evitam rerenders desnecessários
5. DevTools middleware para debug

### Jotai - Estado per-App

```typescript
// apps/calculator/src/state/atoms.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Atoms primitivos
export const valueAtom = atom('0');
export const operationAtom = atom<'+' | '-' | '*' | '/' | null>(null);
export const previousValueAtom = atom('0');

// Atom derivado (computed)
export const displayAtom = atom((get) => {
  const value = get(valueAtom);
  const operation = get(operationAtom);
  
  return operation ? `${get(previousValueAtom)} ${operation} ${value}` : value;
});

// Atom com storage (persiste em localStorage)
export const historyAtom = atomWithStorage<string[]>(
  'calculator-history',
  []
);

// Atom com write (action)
export const calculateAtom = atom(
  null, // read é null (write-only atom)
  (get, set) => {
    const value = parseFloat(get(valueAtom));
    const previous = parseFloat(get(previousValueAtom));
    const operation = get(operationAtom);
    
    if (!operation) return;
    
    let result: number;
    switch (operation) {
      case '+': result = previous + value; break;
      case '-': result = previous - value; break;
      case '*': result = previous * value; break;
      case '/': result = previous / value; break;
    }
    
    const entry = `${previous} ${operation} ${value} = ${result}`;
    
    set(valueAtom, result.toString());
    set(operationAtom, null);
    set(historyAtom, (prev) => [...prev, entry].slice(-10)); // Últimos 10
  }
);
```

```tsx
// apps/calculator/src/App.tsx
import { Provider } from 'jotai';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

export default function Calculator() {
  return (
    <Provider>
      <CalculatorUI />
    </Provider>
  );
}

function CalculatorUI() {
  const [value, setValue] = useAtom(valueAtom);
  const display = useAtomValue(displayAtom);
  const calculate = useSetAtom(calculateAtom);
  
  return (
    <div>
      <Display value={display} />
      <Keypad onNumber={setValue} onEquals={calculate} />
    </div>
  );
}
```

**Por que Jotai aqui?**
1. **Isolamento natural**: Cada app tem seu próprio `<Provider>`
2. **Derivations elegantes**: `displayAtom` recalcula automaticamente
3. **Storage built-in**: `atomWithStorage` para persistência
4. **Suspense nativo**: Atoms async funcionam out-of-the-box
5. **Tree-shakeable**: Apps pequenas não pagam overhead

---

## Consequências

### Positivas

1. **Separação de concerns clara**
   - Zustand = "Kernel" do sistema (window management, registry)
   - Jotai = "Userland" (apps individuais)

2. **Performance otimizada**
   - Zustand: Seletores granulares evitam rerenders
   - Jotai: Atoms atômicos = granularidade máxima

3. **DX superior**
   - Zustand: Zero boilerplate, TypeScript inferência total
   - Jotai: Derivations com `atom((get) => ...)` são elegantes

4. **Module Federation friendly**
   ```typescript
   // No rspack.config.js (host)
   shared: {
     'zustand': { singleton: true, requiredVersion: '^4.5.0' },
     'jotai': { singleton: true, requiredVersion: '^2.6.0' }
   }
   ```

5. **DevTools para ambos**
   - Zustand: Redux DevTools via middleware
   - Jotai: [jotai-devtools](https://github.com/jotaijs/jotai-devtools)

### Negativas

1. **Duas bibliotecas ao invés de uma**
   - Mitigação: Ambas são leves (8.3KB total)
   - Justificativa: Casos de uso são genuinamente diferentes

2. **Curva de aprendizado dupla**
   - Mitigação: Docs internas com exemplos claros
   - Time aprende Zustand (simples), depois Jotai (mais avançada)

3. **Inconsistência potencial**
   - Apps podem usar patterns diferentes
   - Mitigação: SDK fornece templates com best practices

### Trade-offs Aceitos

- **Sacrificamos**: Single source of truth (Redux)
- **Ganhamos**: Flexibilidade, performance, DX

---

## Padrões e Convenções

### Naming

**Zustand stores**:
```typescript
useWindowsStore
useAppRegistryStore
useSettingsStore
useNotificationsStore
```

**Jotai atoms**:
```typescript
valueAtom           // Primitive
displayAtom         // Derived
calculateAtom       // Write-only (action)
historyAtom         // With storage
```

### File Organization

```
packages/state/
├── src/
│   ├── stores/          # Zustand stores (global)
│   │   ├── windows.ts
│   │   ├── registry.ts
│   │   └── settings.ts
│   └── index.ts
└── package.json

apps/calculator/
├── src/
│   ├── state/
│   │   └── atoms.ts     # Jotai atoms (local)
│   └── App.tsx
```

### Testing

```typescript
// Zustand store testing
import { renderHook, act } from '@testing-library/react';
import { useWindowsStore } from './windows';

it('opens window and assigns z-index', () => {
  const { result } = renderHook(() => useWindowsStore());
  
  act(() => {
    result.current.openWindow({ appId: 'calc', title: 'Calculator' });
  });
  
  expect(result.current.windows.size).toBe(1);
  expect(result.current.focusStack).toHaveLength(1);
});
```

```typescript
// Jotai atoms testing
import { renderHook } from '@testing-library/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { valueAtom, calculateAtom } from './atoms';

it('calculates correctly', () => {
  const { result } = renderHook(
    () => ({
      value: useAtomValue(valueAtom),
      calculate: useSetAtom(calculateAtom)
    }),
    { wrapper: Provider }
  );
  
  act(() => result.current.calculate());
  
  expect(result.current.value).toBe('42');
});
```

---

## Integração com Module Federation

### Shared no Host

```typescript
// packages/desktop/rspack.config.js
shared: {
  'zustand': {
    singleton: true,      // CRÍTICO
    requiredVersion: '^4.5.0',
    strictVersion: true   // Evita version mismatch
  },
  'jotai': {
    singleton: true,
    requiredVersion: '^2.6.0'
  },
  '@archbase/workspace-state': {    // Package com stores Zustand
    singleton: true
  }
}
```

### Consumo em Remotes

```typescript
// apps/calculator/src/App.tsx
import { useWindowsStore } from '@archbase/workspace-state'; // Via MF shared
import { Provider } from 'jotai';                  // Via MF shared
import { valueAtom } from './state/atoms';         // Local

export default function Calculator() {
  // Acessa state global do desktop
  const focusWindow = useWindowsStore((s) => s.focusWindow);
  
  return (
    <Provider>
      <div onClick={() => focusWindow(windowId)}>
        <CalculatorUI />
      </div>
    </Provider>
  );
}
```

---

## Métricas de Sucesso

- [ ] Bundle size: < 10KB para state management
- [ ] Rerenders: Mover janela não rerrenderiza outros componentes
- [ ] Type safety: 100% inferência TypeScript
- [ ] HMR: Estado preservado durante dev
- [ ] Tests: > 80% coverage em stores e atoms

---

## Referências

- [Zustand docs](https://docs.pmnd.rs/zustand)
- [Jotai docs](https://jotai.org/)
- [Zustand vs Jotai comparison](https://blog.logrocket.com/jotai-vs-zustand-managing-state-react/)
- [Module Federation + Zustand](https://github.com/module-federation/module-federation-examples/tree/master/zustand-shared-state)

---

**Última atualização**: 2025-02-15  
**Revisão necessária**: Se performance issues aparecerem (measure first!)
