# ADR-001: Escolha de Rspack como Build System

**Status**: Aceito (2025-02-15)

**Decision Makers**: Edson (CTO/Founder)

**Stakeholders**: Time de desenvolvimento, contribuidores open source

---

## Contexto e Problema

Precisamos de um bundler para o projeto Archbase Workspace-like que atenda requisitos críticos:

1. **Suporte nativo a Module Federation 2.0** - Core da arquitetura de microfrontends
2. **Performance superior** - Build times impactam DX em monorepo
3. **TypeScript first-class** - Auto-geração de types para remotes MF
4. **Compatibilidade com ecossistema React** - Plugins, loaders, tooling

### Alternativas Consideradas

Analisamos 4 opções principais:

#### 1. **Webpack 5 + Module Federation**
- ✅ Suporte MF oficial e maduro
- ✅ Ecossistema massivo de plugins
- ✅ Time conhece bem
- ❌ **Builds lentos**: 4144ms para bundle médio
- ❌ Configuração verbosa
- ❌ Problemas de performance em monorepos grandes

#### 2. **Vite + Module Federation Plugin**
- ✅ Builds extremamente rápidos (ESM native)
- ✅ HMR instantâneo
- ✅ DX superior
- ❌ **MF não é first-class**: Plugin comunitário (vite-plugin-federation)
- ❌ **CRÍTICO**: Time do MF declarou explicitamente: *"Vite users will have to get community friends to proxy any requests"* (não há suporte oficial)
- ❌ Build de produção usa Rollup (diferente de dev)

#### 3. **Turbopack (Next.js)**
- ✅ Performance excepcional (Rust-based)
- ✅ Mantido pela Vercel
- ❌ **Não suporta Module Federation** - sem timeline concreta
- ❌ Ainda em beta, breaking changes frequentes
- ❌ Acoplado ao Next.js

#### 4. **Rspack + @module-federation/enhanced** ⭐ ESCOLHIDO
- ✅ **5-10x mais rápido que Webpack**: 320ms vs 4144ms
- ✅ **MF first-class**: ByteDance (criadores do Rspack) colaboram diretamente com Zack Jackson (criador do MF)
- ✅ **API 100% compatível com Webpack**: Drop-in replacement
- ✅ **Auto TypeScript**: MF 2.0 gera `.d.ts` automaticamente para remotes
- ✅ **Rust-based**: Performance próxima ao Turbopack
- ✅ **Chrome DevTools integration**: Debug de MF facilitado
- ✅ Suporte oficial garantido pelo time MF
- ⚠️ Comunidade menor que Webpack
- ⚠️ Menos plugins third-party (mas compatibilidade Webpack ajuda)

---

## Decisão

**Usar Rspack + @module-federation/enhanced como build system oficial do projeto.**

### Justificativa Técnica

1. **Module Federation é não-negociável**: É o core da arquitetura. Precisamos do melhor suporte possível.

2. **Performance importa em monorepo**: Com 10+ packages (core, sdk, ui, cli, apps), builds lentos matam produtividade. 320ms vs 4s é diferença entre flow state e frustração.

3. **Co-desenvolvimento com MF team**: ByteDance e Zack Jackson trabalham juntos. Bugs são resolvidos upstream, não via workarounds.

4. **Compatibilidade Webpack = escape hatch**: Se Rspack der problema crítico, migramos para Webpack sem reescrever configs.

5. **TypeScript automático**: MF 2.0 resolve o problema #1 de DX em microfrontends - types sincronizados entre host e remotes.

### Configuração Base

```js
// packages/desktop/rspack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'desktop_shell',
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.0' },
        zustand: { singleton: true, requiredVersion: '^4.5.0' },
        '@archbase/workspace-sdk': { singleton: true }
      },
      // Types auto-gerados em .mf/
      dts: {
        generateTypes: true,
        tsConfigPath: './tsconfig.json'
      }
    })
  ]
};
```

---

## Consequências

### Positivas

1. **Builds 10x mais rápidos** - DX melhor, CI/CD mais rápido, custos menores
2. **MF confiável** - Suporte oficial elimina categoria inteira de bugs
3. **Types automáticos** - Elimina drift entre host e remotes
4. **DevTools integration** - Debug de loading de remotes facilitado
5. **Ecossistema Webpack disponível** - Loaders e plugins funcionam

### Negativas

1. **Comunidade menor** - Menos Stack Overflow, menos plugins específicos
2. **Documentação em evolução** - Alguns edge cases mal documentados
3. **Risk de projeto morrer** - ByteDance pode descontinuar (mitigado abaixo)

### Mitigação de Riscos

1. **Monitoramento mensal**: Verificar atividade do repo Rspack
2. **Abstração de config**: Manter configs modulares para facilitar migração
3. **Fallback documentado**: Processo de migração Rspack→Webpack documentado em ADR futura se necessário
4. **Benchmark contínuo**: CI/CD mede build times (alerta se degradar)

### Impacto em Outros Componentes

- **Monorepo (Turborepo)**: Rspack integra bem, cache funciona
- **Storybook**: Suporta Rspack via @storybook/rspack-builder
- **Vitest**: Independente do bundler, sem impacto
- **TypeScript**: Melhor integração via auto-generated types

---

## Métricas de Sucesso

- [ ] Build time < 500ms para package isolado
- [ ] Build time < 3s para monorepo completo
- [ ] HMR < 100ms
- [ ] Types MF gerados sem erros
- [ ] Zero breaking changes em minor updates Rspack

---

## Referências

- [Rspack Official Docs](https://rspack.dev/)
- [Module Federation 2.0 GitHub](https://github.com/module-federation/core)
- [ByteDance + MF Partnership Announcement](https://github.com/module-federation/core/discussions/2397)
- [Rspack vs Webpack Benchmark](https://rspack.dev/blog/rspack-0-5-release#benchmark-against-webpack)

---

## Notas de Implementação

### Fase 0 (Walking Skeleton)
- Setup inicial com Rspack
- 1 host + 1 remote simples
- Validar que MF funciona end-to-end

### Fase 1 (Window Management)
- 3-5 apps dummy como remotes
- Testar shared dependencies (React, design tokens)

### Fase 2 (Production-ready)
- Otimizar splits
- Tree-shaking agressivo
- Bundle analysis

---

**Última atualização**: 2025-02-15  
**Revisão necessária**: Após 6 meses de uso (2025-08-15)
