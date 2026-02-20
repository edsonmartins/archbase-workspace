import type { WasmConfig, WasmRuntime, WasmAppApi } from '@archbase/workspace-types';

// ── Constants ──

const MODULE_CACHE_MAX = 50;
const FETCH_TIMEOUT_MS = 30_000;

// ── Cache ──

/** Compiled WebAssembly.Module cache (keyed by wasmUrl, true LRU: hits are promoted to MRU position) */
const moduleCache = new Map<string, WebAssembly.Module>();

/** In-flight compilations keyed by wasmUrl — deduplicates concurrent requests */
const inFlightCompilations = new Map<string, Promise<WebAssembly.Module>>();

/** Active runtime cache (keyed by windowId) */
const runtimeCache = new Map<string, WasmRuntime>();

// ── Helpers ──

/** Fetch with AbortController timeout */
function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * LRU get: return cached value and promote it to most-recently-used position.
 * Map preserves insertion order; delete + re-insert moves the entry to the end.
 */
function lruGet<K, V>(cache: Map<K, V>, key: K): V | undefined {
  const value = cache.get(key);
  if (value !== undefined) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}

/** Evict the least-recently-used (first/oldest) entry if cache exceeds max */
function evictIfNeeded<K, V>(cache: Map<K, V>, max: number): void {
  if (cache.size >= max) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

// ── Public API ──

/**
 * Load, compile, and instantiate a WASM module for a given window.
 *
 * Flow:
 * 1. Pre-fetch declared assets
 * 2. Compile .wasm (streaming if possible, fallback to arrayBuffer)
 * 3. Load JS glue/adapter
 * 4. Instantiate via the adapter's init function
 * 5. Return WasmRuntime
 */
export async function loadWasmModule(
  config: WasmConfig,
  windowId: string,
  container: HTMLElement,
  canvas: HTMLCanvasElement | null,
): Promise<WasmRuntime> {
  // 1. Pre-fetch assets (best-effort — failures are logged, not blocking)
  if (config.assets?.length) {
    const results = await Promise.allSettled(
      config.assets.map((url) => fetchWithTimeout(url)),
    );
    const failed = results
      .map((r, i) => (r.status === 'rejected' ? config.assets![i] : null))
      .filter(Boolean);
    if (failed.length) {
      console.warn(`[wasmLoader] Failed to pre-fetch assets: ${failed.join(', ')}`);
    }
  }

  // 2. Compile WASM binary
  const wasmModule = await compileWasm(config);

  // 3. Create memory
  const memory = createMemory(config);

  // 4. Load JS glue/adapter and instantiate
  const { api, instance } = await instantiateModule(
    config,
    wasmModule,
    memory,
    container,
    canvas,
  );

  // 5. Build runtime
  const runtime: WasmRuntime = {
    module: wasmModule,
    instance,
    memory,
    api,
    destroy: () => {
      api.dispose?.();
      runtimeCache.delete(windowId);
    },
  };

  runtimeCache.set(windowId, runtime);
  return runtime;
}

/** Destroy a WASM runtime associated with a window */
export function destroyWasmRuntime(windowId: string): void {
  const runtime = runtimeCache.get(windowId);
  if (runtime) {
    runtime.destroy();
  }
}

/** Get a cached runtime by window ID */
export function getWasmRuntime(windowId: string): WasmRuntime | undefined {
  return runtimeCache.get(windowId);
}

/** Clear the compiled module cache */
export function clearWasmModuleCache(): void {
  moduleCache.clear();
}

// ── Internal helpers ──

async function compileWasm(config: WasmConfig): Promise<WebAssembly.Module> {
  // 1. Return cached compiled module if available (promote to MRU for LRU eviction)
  const cached = lruGet(moduleCache, config.wasmUrl);
  if (cached) return cached;

  // 2. Deduplicate concurrent compilations: return the in-flight promise if one exists
  const inFlight = inFlightCompilations.get(config.wasmUrl);
  if (inFlight) return inFlight;

  // 3. Start compilation and register in-flight promise
  const compilationPromise = (async (): Promise<WebAssembly.Module> => {
    let module: WebAssembly.Module;

    if (
      config.streamingCompilation !== false &&
      typeof WebAssembly.compileStreaming === 'function'
    ) {
      try {
        // Use a single fetch, reuse the response for fallback
        const response = fetchWithTimeout(config.wasmUrl);
        module = await WebAssembly.compileStreaming(response);
      } catch {
        // Fallback: Content-Type may not be application/wasm — re-fetch as arrayBuffer
        const buffer = await (await fetchWithTimeout(config.wasmUrl)).arrayBuffer();
        module = await WebAssembly.compile(buffer);
      }
    } else {
      const buffer = await (await fetchWithTimeout(config.wasmUrl)).arrayBuffer();
      module = await WebAssembly.compile(buffer);
    }

    evictIfNeeded(moduleCache, MODULE_CACHE_MAX);
    moduleCache.set(config.wasmUrl, module);
    return module;
  })();

  inFlightCompilations.set(config.wasmUrl, compilationPromise);
  try {
    return await compilationPromise;
  } finally {
    inFlightCompilations.delete(config.wasmUrl);
  }
}

function createMemory(config: WasmConfig): WebAssembly.Memory {
  const mem = config.memory ?? {};
  return new WebAssembly.Memory({
    initial: mem.initialPages ?? 256, // 16MB
    maximum: mem.maxPages ?? 16384, // 1GB
    shared: mem.shared ?? false,
  });
}

async function instantiateModule(
  config: WasmConfig,
  wasmModule: WebAssembly.Module,
  memory: WebAssembly.Memory,
  container: HTMLElement,
  canvas: HTMLCanvasElement | null,
): Promise<{ api: WasmAppApi; instance: WebAssembly.Instance }> {
  const initFnName = config.initFunction ?? 'default';

  if (config.jsGlueUrl) {
    // Load the JS adapter/glue
    const glueModule = await loadGlueScript(config.jsGlueUrl);
    const initFn = glueModule[initFnName] as
      | ((
          mod: WebAssembly.Module,
          canvas: HTMLCanvasElement | null,
          container: HTMLElement,
          memory: WebAssembly.Memory,
          env?: Record<string, string>,
        ) => Promise<WasmAppApi | WebAssembly.Instance>)
      | undefined;

    if (typeof initFn !== 'function') {
      throw new Error(
        `WASM adapter does not export '${initFnName}' function from ${config.jsGlueUrl}`,
      );
    }

    const result = await initFn(wasmModule, canvas, container, memory, config.env);

    // The init function may return an api object or a raw Instance
    if (result && 'exports' in result && result instanceof WebAssembly.Instance) {
      // Raw instance: wrap exports as api
      return {
        api: result.exports as unknown as WasmAppApi,
        instance: result,
      };
    }

    // The adapter returned an api object; extract the instance from it if present
    const api = result as WasmAppApi;
    const instance =
      (api as Record<string, unknown>).__instance__ as
        | WebAssembly.Instance
        | undefined;

    // If no instance is embedded, create a dummy reference
    const actualInstance =
      instance ??
      (await WebAssembly.instantiate(wasmModule, {
        env: { memory },
      }));

    return { api, instance: actualInstance };
  }

  // No JS glue: standalone WASM module — instantiate directly
  const instance = await WebAssembly.instantiate(wasmModule, {
    env: { memory },
  });

  return {
    api: instance.exports as unknown as WasmAppApi,
    instance,
  };
}

async function loadGlueScript(
  jsGlueUrl: string,
): Promise<Record<string, unknown>> {
  try {
    // Dynamic import for ES module glue
    return (await import(/* webpackIgnore: true */ jsGlueUrl)) as Record<
      string,
      unknown
    >;
  } catch (importErr) {
    // Fallback: fetch as text and evaluate via blob URL
    try {
      const text = await (await fetchWithTimeout(jsGlueUrl)).text();
      const blob = new Blob([text], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      try {
        return (await import(/* webpackIgnore: true */ url)) as Record<
          string,
          unknown
        >;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (fallbackErr) {
      throw new Error(
        `Failed to load glue script from ${jsGlueUrl}. ` +
        `Import: ${(importErr as Error)?.message}. ` +
        `Fallback: ${(fallbackErr as Error)?.message}`,
      );
    }
  }
}
