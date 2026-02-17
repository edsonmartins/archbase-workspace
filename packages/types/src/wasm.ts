// ============================================================
// WebAssembly App Types (Phase 6.6: WebAssembly Apps)
// ============================================================

/**
 * Rendering mode for a WASM app.
 * - 'canvas-2d': Uses CanvasRenderingContext2D (image editors, drawing apps)
 * - 'canvas-webgl': Uses WebGL/WebGL2 (CAD, 3D renderers)
 * - 'dom': WASM manipulates a DOM container via JS interop
 * - 'hybrid': Both canvas and DOM container are provided
 */
export type WasmRenderMode = 'canvas-2d' | 'canvas-webgl' | 'dom' | 'hybrid';

/**
 * The type of WASM module packaging.
 * - 'emscripten': C/C++ compiled with Emscripten (JS glue + .wasm)
 * - 'wasm-pack': Rust compiled with wasm-pack (JS adapter + .wasm)
 * - 'standalone': Raw .wasm with a custom JS adapter
 */
export type WasmModuleType = 'emscripten' | 'wasm-pack' | 'standalone';

/** Linear memory configuration (pages are 64KB each) */
export interface WasmMemoryConfig {
  /** Initial number of 64KB pages (default: 256 = 16MB) */
  initialPages?: number;
  /** Maximum number of 64KB pages (default: 16384 = 1GB) */
  maxPages?: number;
  /** Whether to use shared memory (SharedArrayBuffer). Requires COOP/COEP headers. */
  shared?: boolean;
}

/** Configuration for a WebAssembly app in the manifest */
export interface WasmConfig {
  /** URL to the .wasm binary file */
  wasmUrl: string;
  /** URL to the JS glue/adapter file */
  jsGlueUrl?: string;
  /** Type of WASM packaging */
  moduleType: WasmModuleType;
  /** Rendering mode */
  renderMode: WasmRenderMode;
  /** Memory configuration */
  memory?: WasmMemoryConfig;
  /** Environment variables passed to the WASM module (e.g., Emscripten ENV) */
  env?: Record<string, string>;
  /** Name of the JS init function exported by glue/adapter (default: 'default') */
  initFunction?: string;
  /** Additional files to pre-fetch before instantiation (e.g., .data files) */
  assets?: string[];
  /** Enable streaming compilation (requires Content-Type: application/wasm). Default: true */
  streamingCompilation?: boolean;
}

/** Keyboard event forwarded to WASM app */
export interface WasmKeyEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/** Pointer event forwarded to WASM app */
export interface WasmPointerEvent {
  x: number;
  y: number;
  button: number;
  buttons: number;
}

/** Wheel event forwarded to WASM app */
export interface WasmWheelEvent {
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

/**
 * The JS-facing API that a WASM app must expose after initialization.
 * This is the contract between the WASM adapter and the workspace host.
 */
export interface WasmAppApi {
  /** Called when the canvas/container is resized */
  resize?(width: number, height: number): void;
  /** Called on requestAnimationFrame for canvas-based apps */
  render?(timestamp: number): void;
  /** Called when the window receives focus */
  onFocus?(): void;
  /** Called when the window loses focus */
  onBlur?(): void;
  /** Called before the WASM module is destroyed */
  dispose?(): void;
  /** Called to inject the workspace SDK */
  setSDK?(sdk: unknown): void;
  /** Forward keyboard events */
  onKeyDown?(event: WasmKeyEvent): boolean;
  onKeyUp?(event: WasmKeyEvent): boolean;
  /** Forward pointer events */
  onPointerDown?(event: WasmPointerEvent): void;
  onPointerMove?(event: WasmPointerEvent): void;
  onPointerUp?(event: WasmPointerEvent): void;
  /** Forward wheel events */
  onWheel?(event: WasmWheelEvent): void;
  /** Generic extension point */
  [key: string]: unknown;
}

/** Runtime state of a loaded WASM module (managed by WasmLoader, not persisted) */
export interface WasmRuntime {
  /** The compiled WebAssembly.Module (cacheable) */
  module: WebAssembly.Module;
  /** The live WebAssembly.Instance */
  instance: WebAssembly.Instance;
  /** The WASM linear memory */
  memory: WebAssembly.Memory;
  /** JS-side API object returned by the adapter */
  api: WasmAppApi;
  /** Cleanup function */
  destroy: () => void;
}
