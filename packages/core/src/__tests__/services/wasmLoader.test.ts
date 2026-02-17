// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WasmConfig } from '@archbase/workspace-types';

// ── Hoisted mocks ──────────────────────────────────────────

const { mockCompiledModule, mockInstance, mockMemory } = vi.hoisted(() => {
  const mockCompiledModule = {} as WebAssembly.Module;
  const mockInstance = {
    exports: {
      render: () => {},
      resize: () => {},
      dispose: () => {},
      setSDK: () => {},
    },
  } as unknown as WebAssembly.Instance;
  const mockMemory = {} as WebAssembly.Memory;
  return { mockCompiledModule, mockInstance, mockMemory };
});

// ── Stub WebAssembly globals ───────────────────────────────

vi.stubGlobal('WebAssembly', {
  compile: vi.fn(async () => mockCompiledModule),
  compileStreaming: vi.fn(async () => mockCompiledModule),
  instantiate: vi.fn(async () => mockInstance),
  Memory: vi.fn(() => mockMemory),
  Module: vi.fn(),
  Instance: vi.fn(),
});

// ── Stub fetch ─────────────────────────────────────────────

vi.stubGlobal(
  'fetch',
  vi.fn(async () => ({
    arrayBuffer: async () => new ArrayBuffer(8),
    text: async () => 'export default function() {}',
    ok: true,
  })),
);

// ── Helpers ────────────────────────────────────────────────

function makeConfig(overrides: Partial<WasmConfig> = {}): WasmConfig {
  return {
    wasmUrl: 'http://localhost:3009/app.wasm',
    moduleType: 'standalone',
    renderMode: 'canvas-2d',
    ...overrides,
  };
}

/**
 * We need a fresh module for each test because wasmLoader has module-level
 * state (moduleCache, runtimeCache). We use vi.resetModules() + dynamic import.
 */
async function freshImport() {
  vi.resetModules();
  const mod = await import('../../services/wasmLoader');
  return mod;
}

// ── Tests ──────────────────────────────────────────────────

describe('wasmLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loadWasmModule returns a WasmRuntime', async () => {
    const { loadWasmModule } = await freshImport();
    const config = makeConfig();
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');

    const runtime = await loadWasmModule(config, 'win-1', container, canvas);

    expect(runtime).toBeDefined();
    expect(runtime.module).toBe(mockCompiledModule);
    expect(runtime.instance).toBe(mockInstance);
    expect(runtime.memory).toBe(mockMemory);
    expect(runtime.api).toBeDefined();
    expect(typeof runtime.destroy).toBe('function');
  });

  it('calls compileStreaming when streamingCompilation is true (default)', async () => {
    const { loadWasmModule } = await freshImport();
    const config = makeConfig({ streamingCompilation: true });
    const container = document.createElement('div');

    await loadWasmModule(config, 'win-2', container, null);

    expect(WebAssembly.compileStreaming).toHaveBeenCalledTimes(1);
  });

  it('falls back to compile when compileStreaming throws', async () => {
    const { loadWasmModule } = await freshImport();
    (WebAssembly.compileStreaming as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Content-Type not application/wasm'),
    );
    const config = makeConfig();
    const container = document.createElement('div');

    const runtime = await loadWasmModule(config, 'win-3', container, null);

    expect(WebAssembly.compileStreaming).toHaveBeenCalledTimes(1);
    expect(WebAssembly.compile).toHaveBeenCalledTimes(1);
    expect(runtime.module).toBe(mockCompiledModule);
  });

  it('returns cached module on second load with same wasmUrl', async () => {
    const { loadWasmModule } = await freshImport();
    const config = makeConfig();
    const container = document.createElement('div');

    await loadWasmModule(config, 'win-4a', container, null);
    await loadWasmModule(config, 'win-4b', container, null);

    // compileStreaming should only be called once (cached second time)
    expect(WebAssembly.compileStreaming).toHaveBeenCalledTimes(1);
  });

  it('clearWasmModuleCache clears the cache so next load recompiles', async () => {
    const { loadWasmModule, clearWasmModuleCache } = await freshImport();
    const config = makeConfig();
    const container = document.createElement('div');

    await loadWasmModule(config, 'win-5a', container, null);
    clearWasmModuleCache();
    await loadWasmModule(config, 'win-5b', container, null);

    // compileStreaming called twice (cache was cleared)
    expect(WebAssembly.compileStreaming).toHaveBeenCalledTimes(2);
  });

  it('creates memory with correct page config', async () => {
    const { loadWasmModule } = await freshImport();
    const config = makeConfig({
      memory: { initialPages: 128, maxPages: 512, shared: true },
    });
    const container = document.createElement('div');

    await loadWasmModule(config, 'win-6', container, null);

    expect(WebAssembly.Memory).toHaveBeenCalledWith({
      initial: 128,
      maximum: 512,
      shared: true,
    });
  });

  it('destroyWasmRuntime calls api.dispose and removes from cache', async () => {
    const { loadWasmModule, destroyWasmRuntime, getWasmRuntime } = await freshImport();
    const config = makeConfig();
    const container = document.createElement('div');

    const runtime = await loadWasmModule(config, 'win-7', container, null);
    const disposeSpy = vi.spyOn(runtime.api, 'dispose');

    destroyWasmRuntime('win-7');

    expect(disposeSpy).toHaveBeenCalledTimes(1);
    expect(getWasmRuntime('win-7')).toBeUndefined();
  });

  it('getWasmRuntime returns cached runtime', async () => {
    const { loadWasmModule, getWasmRuntime } = await freshImport();
    const config = makeConfig();
    const container = document.createElement('div');

    const runtime = await loadWasmModule(config, 'win-8', container, null);
    const cached = getWasmRuntime('win-8');

    expect(cached).toBe(runtime);
  });

  it('getWasmRuntime returns undefined for unknown windowId', async () => {
    const { getWasmRuntime } = await freshImport();
    expect(getWasmRuntime('nonexistent')).toBeUndefined();
  });

  it('rejects when fetch fails', async () => {
    const { loadWasmModule } = await freshImport();
    (WebAssembly.compileStreaming as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Content-Type not application/wasm'),
    );
    // First fetch call is the argument passed to compileStreaming (succeeds but is ignored).
    // Second fetch call is the fallback path — make this one fail.
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        arrayBuffer: async () => new ArrayBuffer(8),
        ok: true,
      })
      .mockRejectedValueOnce(new Error('Network error'));
    const config = makeConfig();
    const container = document.createElement('div');

    await expect(loadWasmModule(config, 'win-10', container, null)).rejects.toThrow(
      'Network error',
    );
  });

  it('pre-fetches assets before compilation', async () => {
    const { loadWasmModule } = await freshImport();
    const config = makeConfig({
      assets: ['http://localhost:3009/data.bin', 'http://localhost:3009/textures.bin'],
    });
    const container = document.createElement('div');

    await loadWasmModule(config, 'win-11', container, null);

    // fetch is called for the 2 assets + the streaming compilation fetch
    // (compileStreaming calls fetch internally via our stub, but our mock
    // of compileStreaming doesn't actually call fetch — the asset fetches are explicit)
    const fetchCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(fetchCalls.some((c: string[]) => c[0] === 'http://localhost:3009/data.bin')).toBe(true);
    expect(fetchCalls.some((c: string[]) => c[0] === 'http://localhost:3009/textures.bin')).toBe(true);
  });

  it('uses non-streaming compilation when streamingCompilation is false', async () => {
    const { loadWasmModule } = await freshImport();
    const config = makeConfig({ streamingCompilation: false });
    const container = document.createElement('div');

    await loadWasmModule(config, 'win-12', container, null);

    expect(WebAssembly.compileStreaming).not.toHaveBeenCalled();
    expect(WebAssembly.compile).toHaveBeenCalledTimes(1);
  });
});
