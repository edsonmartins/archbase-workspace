import { describe, it, expect } from 'vitest';
import { validateManifestSafe } from '../manifest';

const validWasmManifest = {
  id: 'test.wasm.app',
  name: 'test_wasm',
  version: '1.0.0',
  entrypoint: '',
  remoteEntry: '',
  runtime: 'wasm' as const,
  wasm: {
    wasmUrl: 'http://localhost:3009/app.wasm',
    jsGlueUrl: 'http://localhost:3009/adapter.js',
    moduleType: 'standalone' as const,
    renderMode: 'canvas-2d' as const,
  },
};

const validMfManifest = {
  id: 'test.mf.app',
  name: 'test_mf',
  version: '1.0.0',
  entrypoint: './App',
  remoteEntry: 'http://localhost:3001/mf-manifest.json',
};

describe('Manifest Zod Schema — WASM support', () => {
  it('accepts a valid WASM manifest', () => {
    const result = validateManifestSafe(validWasmManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.runtime).toBe('wasm');
      expect(result.data.wasm).toBeDefined();
      expect(result.data.wasm!.wasmUrl).toBe('http://localhost:3009/app.wasm');
    }
  });

  it('accepts a valid MF manifest (backward compatibility)', () => {
    const result = validateManifestSafe(validMfManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entrypoint).toBe('./App');
      expect(result.data.remoteEntry).toBe('http://localhost:3001/mf-manifest.json');
    }
  });

  it('rejects WASM manifest with empty wasmUrl', () => {
    const manifest = {
      ...validWasmManifest,
      wasm: { ...validWasmManifest.wasm, wasmUrl: '' },
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects WASM manifest with invalid moduleType', () => {
    const manifest = {
      ...validWasmManifest,
      wasm: { ...validWasmManifest.wasm, moduleType: 'invalid-type' },
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects WASM manifest with invalid renderMode', () => {
    const manifest = {
      ...validWasmManifest,
      wasm: { ...validWasmManifest.wasm, renderMode: 'svg' },
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects runtime="wasm" without wasm config', () => {
    const manifest = {
      id: 'test.wasm.missing',
      name: 'test_wasm_missing',
      version: '1.0.0',
      entrypoint: './App',
      remoteEntry: 'http://localhost:3001/mf-manifest.json',
      runtime: 'wasm' as const,
      // No wasm config
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("runtime 'wasm' requires 'wasm' configuration");
    }
  });

  it('rejects runtime="iframe" without sandbox config', () => {
    const manifest = {
      id: 'test.iframe.missing',
      name: 'test_iframe_missing',
      version: '1.0.0',
      entrypoint: './App',
      remoteEntry: 'http://localhost:3001/mf-manifest.json',
      runtime: 'iframe' as const,
      // No sandbox config
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("runtime 'iframe' requires 'sandbox' configuration");
    }
  });

  it('rejects MF manifest with empty entrypoint (superRefine)', () => {
    const manifest = {
      ...validMfManifest,
      entrypoint: '',
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('entrypoint');
    }
  });

  it('rejects MF manifest with empty remoteEntry (superRefine)', () => {
    const manifest = {
      ...validMfManifest,
      remoteEntry: '',
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('remoteEntry');
    }
  });

  it('accepts WASM manifest with empty entrypoint (wasm relaxes the requirement)', () => {
    const result = validateManifestSafe(validWasmManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      // WASM manifest has empty entrypoint and remoteEntry, which is fine
      expect(result.data.entrypoint).toBe('');
      expect(result.data.remoteEntry).toBe('');
    }
  });

  it('accepts WASM manifest with memory config using positive integers', () => {
    const manifest = {
      ...validWasmManifest,
      wasm: {
        ...validWasmManifest.wasm,
        memory: {
          initialPages: 256,
          maxPages: 16384,
          shared: false,
        },
      },
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wasm!.memory!.initialPages).toBe(256);
      expect(result.data.wasm!.memory!.maxPages).toBe(16384);
      expect(result.data.wasm!.memory!.shared).toBe(false);
    }
  });

  it('rejects WASM manifest with memory config using negative integers', () => {
    const manifest = {
      ...validWasmManifest,
      wasm: {
        ...validWasmManifest.wasm,
        memory: {
          initialPages: -1,
          maxPages: -100,
        },
      },
    };
    const result = validateManifestSafe(manifest);
    expect(result.success).toBe(false);
  });
});
