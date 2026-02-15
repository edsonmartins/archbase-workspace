# Contributing to Archbase Workspace

Obrigado pelo interesse em contribuir! Este documento explica como trabalhamos com decisões arquiteturais (ADRs) e propostas de features (RFCs).

---

## 📋 Processo de Decisões

### Quando criar um ADR?

**Architecture Decision Record (ADR)** documenta decisões **já tomadas** que impactam arquitetura.

✅ **Crie ADR para**:
- Escolha de biblioteca (Zustand vs Redux)
- Decisão de arquitetura (Shadow DOM vs iframe)
- Tradeoffs técnicos (performance vs DX)
- Padrões do projeto (file structure, naming)

❌ **Não crie ADR para**:
- Bug fixes triviais
- Refactorings internos sem impacto externo
- Updates de dependências (a menos que breaking)

### Quando criar um RFC?

**Request for Comments (RFC)** propõe feature **futura** para discussão.

✅ **Crie RFC para**:
- Nova API pública (WindowService, AppManifest)
- Features substanciais (Activation Events, Permission System)
- Mudanças que afetam third-party apps
- Qualquer coisa que precisa de consenso

❌ **Não crie RFC para**:
- Pequenas melhorias incrementais
- Decisões internas que não afetam API
- Features já aprovadas (use ADR)

---

## 🛠️ Como criar um ADR

### 1. Escolha o número

```bash
# Veja último ADR
ls docs/adr/

# Próximo número disponível
# Se último é 0004, seu será 0005
```

### 2. Use o template

```bash
cp docs/adr/0000-template.md docs/adr/0005-seu-titulo.md
```

### 3. Preencha as seções

```markdown
# ADR-005: Título da Decisão

**Status**: Aceito | Proposto | Rejeitado | Superseded by ADR-XXX

**Decision Makers**: Seu nome

**Stakeholders**: Quem é afetado

---

## Contexto e Problema

Descreva:
- Qual problema está resolvendo?
- Por que isso importa?
- Quais são os requisitos?

## Decisão

**O que foi decidido?**

Seja claro e objetivo. Exemplo:
"Usar Zustand para state global do desktop shell"

## Consequências

### Positivas
- ✅ Benefício 1
- ✅ Benefício 2

### Negativas
- ❌ Tradeoff 1 (e como mitigar)
- ❌ Tradeoff 2

## Alternativas Consideradas

Liste outras opções e por que foram descartadas.

## Referências

Links, artigos, documentação relevante.
```

### 4. Commit e PR

```bash
git checkout -b adr/005-seu-titulo
git add docs/adr/0005-seu-titulo.md
git commit -m "docs: ADR-005 - Seu Título"
git push origin adr/005-seu-titulo
```

Abra PR com label `documentation`.

### 5. Review

- Time revisa (mínimo 2 aprovações)
- Discussão no PR
- Ajustes se necessário
- Merge após aprovação

---

## 📝 Como criar um RFC

### 1. Escolha o número

```bash
ls docs/rfcs/
# Próximo número disponível
```

### 2. Use o template

```bash
cp docs/rfcs/0000-template.md docs/rfcs/0003-seu-titulo.md
```

### 3. Preencha as seções

```markdown
# RFC-003: Título da Proposta

**Status**: Draft | Discussion | Accepted | Rejected

**Author**: Seu nome

---

## Summary

1-2 parágrafos explicando proposta.

## Motivation

Por que precisamos disso?
- Use cases concretos
- Problemas que resolve

## Detailed Design

Como vai funcionar?
- API design
- Exemplos de código
- Diagramas se necessário

## Drawbacks

Por que NÃO fazer isso?
- Complexidade adicionada
- Custos
- Alternativas melhores?

## Alternatives Considered

Outras abordagens exploradas.

## Adoption Strategy

Como vamos implementar?
- Fases
- Migration path
- Breaking changes?

## Unresolved Questions

Perguntas ainda em aberto para discussão.
```

### 4. Open Discussion

```bash
git checkout -b rfc/003-seu-titulo
git add docs/rfcs/0003-seu-titulo.md
git commit -m "docs: RFC-003 - Seu Título [DRAFT]"
git push origin rfc/003-seu-titulo
```

Abra PR com:
- Label `rfc`
- Template de RFC (discussão)
- Marque reviewers relevantes

### 5. Discussion Period

- **7 dias** de discussão (default)
- Time comenta no PR
- Author atualiza RFC baseado em feedback
- Pode haver múltiplas iterações

### 6. Final Comment Period

Após consenso emergir:
- Marcar **"Final Comment Period"** (3 dias)
- Últimas objeções
- Decision deadline

### 7. Resolution

- **Accepted**: Merge PR, status → Accepted
- **Rejected**: Close PR, status → Rejected, documentar razões

---

## 🎯 Checklist Antes de Contribuir

### Para Features

- [ ] RFC escrito e aprovado? (se feature substancial)
- [ ] ADR criado para decisões arquiteturais?
- [ ] Tests planejados?
- [ ] Docs necessárias identificadas?
- [ ] Breaking changes documentadas?

### Para Bug Fixes

- [ ] Issue aberto descrevendo bug?
- [ ] Test que reproduz bug criado?
- [ ] Fix implementado?
- [ ] Test passa?
- [ ] Não quebra outros tests?

### Para Commits

- [ ] Mensagem segue [Conventional Commits](https://www.conventionalcommits.org/)?
  - `feat:` - Nova feature
  - `fix:` - Bug fix
  - `docs:` - Documentação
  - `refactor:` - Refactoring
  - `test:` - Testes
  - `chore:` - Manutenção

Exemplo:
```bash
git commit -m "feat(window): add snap to edges functionality"
git commit -m "fix(drag): prevent drag outside viewport"
git commit -m "docs: update ADR-004 with performance notes"
```

---

## 🧪 Testing Guidelines

### Unit Tests (Vitest)

```typescript
// packages/core/src/services/__tests__/windowService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { windowService } from '../windowService';

describe('WindowService', () => {
  beforeEach(() => {
    // Reset state
    windowService.closeAll();
  });
  
  it('opens window and assigns ID', () => {
    const id = windowService.open({
      appId: 'test',
      title: 'Test'
    });
    
    expect(id).toBeDefined();
    expect(windowService.exists(id)).toBe(true);
  });
});
```

### E2E Tests (Playwright)

```typescript
// packages/core/e2e/window-drag.spec.ts
import { test, expect } from '@playwright/test';

test('dragging window updates position', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Open window
  await page.click('[data-testid="open-calculator"]');
  
  // Drag window
  const header = page.locator('[data-window-header]');
  await header.dragTo(page.locator('body'), {
    targetPosition: { x: 500, y: 300 }
  });
  
  // Verify position
  const window = page.locator('[data-window-id]').first();
  const transform = await window.evaluate(el => 
    window.getComputedStyle(el).transform
  );
  
  expect(transform).toContain('500');
});
```

---

## 📚 Code Style

### TypeScript

```typescript
// ✅ GOOD
interface WindowOptions {
  appId: string;
  title: string;
  width?: number; // Optional com ?
}

function openWindow(options: WindowOptions): string {
  // Return type explícito
  const id = crypto.randomUUID();
  return id;
}

// ❌ BAD
function openWindow(appId, title, width) { // Sem types
  return crypto.randomUUID();
}
```

### React Components

```tsx
// ✅ GOOD
interface WindowProps {
  id: string;
  onClose?: () => void;
}

export function Window({ id, onClose }: WindowProps) {
  const window = useWindow(id);
  
  if (!window) return null;
  
  return <div>...</div>;
}

// ❌ BAD
export function Window(props) { // Sem types
  return <div>...</div>;
}
```

### File Naming

```
✅ GOOD:
- windowService.ts (camelCase)
- Window.tsx (PascalCase para componentes)
- useWindowService.ts (hooks com use prefix)
- window.test.ts (tests com .test)

❌ BAD:
- WindowService.ts (deveria ser camelCase)
- window.tsx (componente deveria ser PascalCase)
- windowServiceTest.ts (deveria ter .test)
```

---

## 🔍 PR Review Checklist

Reviewers devem verificar:

### Código
- [ ] TypeScript types corretos?
- [ ] Testes cobrem casos principais?
- [ ] Performance considerada? (profiling se crítico)
- [ ] Acessibilidade (ARIA, keyboard navigation)?
- [ ] Error handling adequado?

### Documentação
- [ ] ADR criado se decisão arquitetural?
- [ ] RFC aprovado se feature nova?
- [ ] Docs atualizadas?
- [ ] Changelog entry adicionado?

### Build
- [ ] CI passa (lint, typecheck, tests)?
- [ ] Build size não cresceu > 10%?
- [ ] Bundle analysis OK?

---

## 📖 Recursos

### Templates
- [ADR Template](docs/adr/0000-template.md)
- [RFC Template](docs/rfcs/0000-template.md)

### Exemplos
- [ADR-001: Rspack Build System](docs/adr/0001-rspack-build-system.md)
- [RFC-001: Window Service API](docs/rfcs/0001-window-service-api.md)

### External
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Architectural Decision Records](https://adr.github.io/)
- [Rust RFC Process](https://github.com/rust-lang/rfcs)

---

## 💬 Comunicação

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Ideias, perguntas
- **Discord**: Chat em tempo real (link no README)

---

## ❓ FAQ

### "Preciso de RFC para pequena melhoria?"

Não. RFCs são para mudanças **substanciais**. Pequenas melhorias podem ir direto em PRs.

### "E se meu ADR for rejeitado?"

ADRs documentam decisões **já tomadas**. Se há discordância, discussão acontece **antes** do ADR, via RFC ou GitHub Discussion.

### "Posso atualizar ADR antigo?"

Sim, se nova informação surgir. Adicione seção "Updates" com timestamp.

### "Quantas aprovações preciso?"

- ADR: Mínimo 2 approvals (core team)
- RFC: Mínimo 3 approvals + 7 dias de discussão
- PR normal: 1 approval

---

**Dúvidas?** Abra issue ou pergunte no Discord!
