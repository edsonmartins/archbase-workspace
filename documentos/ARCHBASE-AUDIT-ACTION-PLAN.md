# Archbase Workspace — Plano de Ação Pós-Auditoria

**Data da auditoria**: 2026-02-19
**Auditor**: Claude Sonnet 4.6 (7 agentes paralelos)
**Status**: Em execução

---

## Sprint Imediato — Bugs Críticos

### S1. Race condition WASM compilation
- **Arquivo**: `packages/core/src/services/wasmLoader.ts:115-142`
- **Problema**: Duas chamadas paralelas a `compileWasm()` para a mesma URL compilam o módulo duas vezes (sem guard entre cache-check e cache-set).
- **Fix**: Adicionar `Map<url, Promise<WebAssembly.Module>>` de in-flight requests; retornar a promise existente se já em andamento.
- **Risco**: Alto — spike de memória e CPU em apps WASM de alta frequência.

### S2. postMessage com origin `'*'` (XSS)
- **Arquivos**: `packages/sdk/src/bridge/iframeBridge.ts:51-52`, `packages/core/src/components/SandboxedApp.tsx:43`
- **Problema**: Default `'*'` aceita mensagens de qualquer origem; em produção é vulnerabilidade XSS.
- **Fix**: Remover default `'*'`; exigir `targetOrigin` explícito; lançar `console.error` em dev e ignorar em prod se `'*'`.
- **Risco**: Crítico em produção — permite que iframes maliciosos controlem o SDK.

### S3. CollaborationClient double-cleanup / memory leak
- **Arquivo**: `packages/collaboration/src/CollaborationClient.ts:117-163`
- **Problema**: Chamar `join()` sem chamar `leave()` entre tentativas acumula listeners em `cleanupFns[]`.
- **Fix**: Limpar `cleanupFns = []` explicitamente no início de `join()`, antes de registrar novos listeners.
- **Risco**: Memory leak progressivo em sessões de colaboração com reconexões.

### S4. Build artifacts em `packages/types/src/`
- **Diretório**: `packages/types/src/*.{js,d.ts,map}` (48 arquivos não rastreados)
- **Problema**: TypeScript está gerando output em src/ (provavelmente compilação manual ou IDE).
  O `package.json` usa `"build": "tsc"` sem tsconfig.build.json, diferente dos outros pacotes.
- **Fix**:
  1. Criar `packages/types/tsconfig.build.json` (como packages/state tem)
  2. Atualizar `"build": "tsc -p tsconfig.build.json"` em packages/types/package.json
  3. Adicionar `packages/types/src/**/*.js` ao `.gitignore` raiz
  4. Deletar os artefatos da src/
- **Risco**: Git poluído; builds não-determinísticos.

### S5. 5 discrepâncias no SDK API doc
- **Arquivo**: `documentos/ARCHBASE-WORKSPACE-SDK-API.md`
- **Problemas**:
  1. `sdk.collaboration.join()` — doc mostra `(roomId, user)`, código aceita apenas `(roomId)` (linha 979)
  2. `sdk.collaboration.shareWindow()` — doc omite parâmetro `mode?: ShareMode` (linha 983)
  3. Tipo `Permission` no Appendix 7 não inclui `'collaboration'` (linhas 1228-1237)
  4. `useTheme()` não documenta `resolvedTheme` retornado (linhas 468-498)
  5. `ContextMenuItem` no Appendix 7 ainda incompleto: falta `shortcut`, `separator`, `children`; `action` marcado como required (linhas 1257-1263)

---

## Sprint 2 — Qualidade e Confiabilidade

### Q1. DBPromise IDB sem recovery
- **Arquivos**: `packages/state/src/middleware/idbStorage.ts:8-21`, `packages/sdk/src/services/asyncStorageService.ts:8-21`
- **Problema**: Se `openDB()` rejeitar, a promise rejeitada fica cached para sempre. Storage inacessível na sessão.
- **Fix**: Reset `dbPromise = null` em caso de erro + retry com limite.

### Q2. WasmApp render loop sem error boundary
- **Arquivo**: `packages/core/src/components/WasmApp.tsx:66-75`
- **Problema**: `rt.api.render(ts)` pode lançar exception e parar o loop silenciosamente.
- **Fix**: `try-catch` no loop; setar estado de erro no componente.

### Q3. Expandir E2E tests
- **Diretório**: `e2e/tests/`
- **Gap**: 15 testes cobre apenas fluxos básicos. Faltam:
  - Collaboration (cursores, presença, follow-mode)
  - Marketplace (busca, instalação, ratings)
  - Permission prompts (grant/deny)
  - Theme switching
  - Keyboard shortcuts
  - Window tiling/cascade/snap
  - WebAssembly apps

### Q4. Testes hooks SDK
- **Diretório**: `packages/sdk/src/hooks/__tests__/`
- **Gap**: Apenas `useTheme` tem testes. Faltam:
  - `useWorkspace`, `useCommand`, `useStorage`, `useWindowContext`, `useSetting`

---

## Backlog — Tech Debt

### B1. ADR-001 (Rspack) — Review vencido
- **Deadline original**: 2025-08-15 (vencido ~6 meses)
- **Ação**: Revisar se há breaking changes em Rspack/MF enhanced; confirmar segurança.

### B2. WASM cache FIFO → LRU
- **Arquivo**: `packages/core/src/services/wasmLoader.ts:25-31`
- **Problema**: Evicção deleta o mais antigo inserido, não o menos usado.
- **Fix**: Track de acesso por timestamp; evict o LRU.

### B3. Extrair DISCOVERY_TIMEOUT_MS
- **Arquivos**: `packages/state/src/stores/registry.ts:147,178`, `marketplace.ts:133`
- **Problema**: `10000` hardcoded em 3 lugares.
- **Fix**: `const DISCOVERY_TIMEOUT_MS = 10_000` como constante compartilhada.

### B4. Testes de componentes ausentes
- Componentes: `NotificationCenter.tsx`, `Desktop.tsx`, `AppLauncher.tsx`, `AriaLiveRegion.tsx`, `SandboxedApp.tsx`
- Hooks core: `useDrag.ts`, `useResize.ts`, `useFocusTrap.ts`, `useRegistryInit.ts`

---

## Rastreamento de Progresso

| ID | Item | Prioridade | Status |
|----|------|-----------|--------|
| S1 | Race condition WASM | CRÍTICO | ⬜ Pendente |
| S2 | postMessage origin '*' | CRÍTICO | ⬜ Pendente |
| S3 | CollaborationClient double-cleanup | CRÍTICO | ⬜ Pendente |
| S4 | Build artifacts types/src/ | CRÍTICO | ⬜ Pendente |
| S5 | SDK API doc 5 discrepâncias | ALTO | ⬜ Pendente |
| Q1 | DBPromise IDB recovery | ALTO | ⬜ Pendente |
| Q2 | WasmApp render error boundary | ALTO | ⬜ Pendente |
| Q3 | E2E coverage expansion | MÉDIO | ⬜ Pendente |
| Q4 | SDK hook tests | MÉDIO | ⬜ Pendente |
| B1 | ADR-001 review | BAIXO | ⬜ Pendente |
| B2 | LRU WASM cache | BAIXO | ⬜ Pendente |
| B3 | DISCOVERY_TIMEOUT_MS constante | BAIXO | ⬜ Pendente |
| B4 | Component tests | BAIXO | ⬜ Pendente |
