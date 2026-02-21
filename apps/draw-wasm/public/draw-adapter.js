// ============================================================
// Draw WASM Adapter — JS fallback drawing canvas
// Implements the WasmAppApi contract for Archbase Workspace
// ============================================================

/** @type {CanvasRenderingContext2D | null} */
let ctx = null;

/** @type {HTMLCanvasElement | null} */
let canvasEl = null;

/** @type {WebAssembly.Instance | null} */
let wasmInstance = null;

/** @type {boolean} */
let useWasmPixelBuffer = false;

/** @type {Uint8ClampedArray | null} */
let pixelBuffer = null;

/** @type {unknown} */
let sdkRef = null;

// Drawing state
let canvasWidth = 800;
let canvasHeight = 600;
let brushColor = '#000000';
let brushSize = 3;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Theme state
let bgColor = '#ffffff';
let bgR = 255;
let bgG = 255;
let bgB = 255;

function detectTheme() {
  const theme = document.documentElement.getAttribute('data-theme');
  const dark = theme === 'dark';
  bgColor = dark ? '#1e293b' : '#ffffff';
  bgR = dark ? 30 : 255;
  bgG = dark ? 41 : 255;
  bgB = dark ? 59 : 255;
  brushColor = dark ? '#e2e8f0' : '#000000';
}

// ── WASM import functions (called by WASM module) ──

function wasm_canvas_width() {
  return canvasWidth;
}

function wasm_canvas_height() {
  return canvasHeight;
}

function wasm_set_pixel(x, y, r, g, b, a) {
  if (!pixelBuffer) return;
  const idx = (y * canvasWidth + x) * 4;
  pixelBuffer[idx] = r;
  pixelBuffer[idx + 1] = g;
  pixelBuffer[idx + 2] = b;
  pixelBuffer[idx + 3] = a;
}

function wasm_clear_canvas(r, g, b, a) {
  if (!pixelBuffer) return;
  for (let i = 0; i < pixelBuffer.length; i += 4) {
    pixelBuffer[i] = r;
    pixelBuffer[i + 1] = g;
    pixelBuffer[i + 2] = b;
    pixelBuffer[i + 3] = a;
  }
}

function wasm_draw_line(x0, y0, x1, y1, r, g, b, a, width) {
  // Bresenham with thickness — for WASM pixel buffer mode
  if (!pixelBuffer) return;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  const halfW = Math.floor(width / 2);

  while (true) {
    // Draw a filled circle at each point for line thickness
    for (let oy = -halfW; oy <= halfW; oy++) {
      for (let ox = -halfW; ox <= halfW; ox++) {
        if (ox * ox + oy * oy <= halfW * halfW) {
          const px = x0 + ox;
          const py = y0 + oy;
          if (px >= 0 && px < canvasWidth && py >= 0 && py < canvasHeight) {
            wasm_set_pixel(px, py, r, g, b, a);
          }
        }
      }
    }

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

// ── JS fallback drawing helpers ──

function jsClearCanvas() {
  if (!ctx || !canvasEl) return;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
}

function jsDrawLine(fromX, fromY, toX, toY) {
  if (!ctx) return;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = brushColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function jsSaveCanvas() {
  if (!canvasEl) return;
  const link = document.createElement('a');
  link.download = 'drawing.png';
  link.href = canvasEl.toDataURL('image/png');
  link.click();
}

// ── Hex color to RGBA components ──

function hexToRGBA(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0, a: 255 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: 255,
  };
}

// ── WasmAppApi implementation ──

/**
 * Initialise the draw adapter.
 *
 * @param {WebAssembly.Module} wasmModule - Compiled WASM module
 * @param {HTMLCanvasElement | null} canvas - Canvas element (if canvas-2d mode)
 * @param {HTMLElement} container - DOM container
 * @param {WebAssembly.Memory} memory - Shared linear memory
 * @param {Record<string, string>} [env] - Environment variables
 * @returns {Promise<object>} WasmAppApi-compatible object
 */
export default async function init(wasmModule, canvas, container, memory, env) {
  canvasEl = canvas;
  detectTheme();

  if (canvasEl) {
    ctx = canvasEl.getContext('2d');
    canvasWidth = canvasEl.width;
    canvasHeight = canvasEl.height;
  }

  // Try to instantiate the WASM module
  try {
    const importObject = {
      env: {
        memory,
        canvas_width: wasm_canvas_width,
        canvas_height: wasm_canvas_height,
        set_pixel: wasm_set_pixel,
        clear_canvas: wasm_clear_canvas,
        draw_line: wasm_draw_line,
      },
    };

    const instance = await WebAssembly.instantiate(wasmModule, importObject);
    wasmInstance = instance;

    // Check if the module has actual exported functions we can use
    const exports = instance.exports;
    if (typeof exports.init === 'function') {
      exports.init();
    }

    // Allocate pixel buffer for WASM rendering path
    pixelBuffer = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
    // Fill with theme background
    for (let i = 0; i < pixelBuffer.length; i += 4) {
      pixelBuffer[i] = bgR;
      pixelBuffer[i + 1] = bgG;
      pixelBuffer[i + 2] = bgB;
      pixelBuffer[i + 3] = 255;
    }
    useWasmPixelBuffer = true;

    console.log('[draw-wasm] WASM module instantiated successfully');
  } catch (err) {
    // WASM instantiation failed — fall back to pure JS canvas drawing
    console.warn('[draw-wasm] WASM instantiation failed, using JS fallback:', err.message);
    wasmInstance = null;
    useWasmPixelBuffer = false;
  }

  // Initial clear
  if (useWasmPixelBuffer && pixelBuffer) {
    // Pixel buffer already filled white
  } else {
    jsClearCanvas();
  }

  // Return WasmAppApi-compatible object
  return {
    /** Expose the WASM instance if available (used by wasmLoader to build WasmRuntime) */
    __instance__: wasmInstance,

    setSDK,
    render,
    resize,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    dispose,
  };
}

/**
 * Receive the workspace SDK and register commands.
 * @param {unknown} sdk
 */
export function setSDK(sdk) {
  sdkRef = sdk;

  if (sdk && typeof sdk === 'object' && 'commands' in sdk) {
    const cmds = /** @type {{ register: Function }} */ (sdk.commands);

    cmds.register('draw-wasm.clear', {
      title: 'Draw: Clear Canvas',
      handler: () => {
        detectTheme();
        if (useWasmPixelBuffer && pixelBuffer) {
          wasm_clear_canvas(bgR, bgG, bgB, 255);
          flushPixelBuffer();
        } else {
          jsClearCanvas();
        }
      },
    });

    cmds.register('draw-wasm.save', {
      title: 'Draw: Save as PNG',
      handler: () => {
        jsSaveCanvas();
      },
    });
  }
}

/**
 * Render callback — called on each animation frame by the host.
 * For WASM pixel-buffer mode, copies the buffer to the canvas via ImageData.
 * For JS fallback mode, drawing is immediate so this is a no-op.
 * @param {number} _timestamp
 */
export function render(_timestamp) {
  if (useWasmPixelBuffer) {
    flushPixelBuffer();
  }
  // JS fallback: drawing is immediate via ctx calls, nothing to do here
}

/**
 * Flush the WASM pixel buffer to the canvas.
 */
function flushPixelBuffer() {
  if (!ctx || !pixelBuffer || !canvasEl) return;
  const imageData = new ImageData(pixelBuffer, canvasWidth, canvasHeight);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Handle canvas/window resize.
 * @param {number} w
 * @param {number} h
 */
export function resize(w, h) {
  canvasWidth = w;
  canvasHeight = h;

  if (canvasEl) {
    canvasEl.width = w;
    canvasEl.height = h;
  }

  if (useWasmPixelBuffer) {
    // Reallocate pixel buffer for new dimensions
    const oldBuffer = pixelBuffer;
    pixelBuffer = new Uint8ClampedArray(w * h * 4);
    // Fill with theme background
    for (let i = 0; i < pixelBuffer.length; i += 4) {
      pixelBuffer[i] = bgR;
      pixelBuffer[i + 1] = bgG;
      pixelBuffer[i + 2] = bgB;
      pixelBuffer[i + 3] = 255;
    }

    // Copy what fits from the old buffer
    if (oldBuffer) {
      const oldWidth = Math.min(canvasWidth, w);
      const oldHeight = Math.min(canvasHeight, h);
      for (let y = 0; y < oldHeight; y++) {
        for (let x = 0; x < oldWidth; x++) {
          const oldIdx = (y * canvasWidth + x) * 4;
          const newIdx = (y * w + x) * 4;
          pixelBuffer[newIdx] = oldBuffer[oldIdx];
          pixelBuffer[newIdx + 1] = oldBuffer[oldIdx + 1];
          pixelBuffer[newIdx + 2] = oldBuffer[oldIdx + 2];
          pixelBuffer[newIdx + 3] = oldBuffer[oldIdx + 3];
        }
      }
    }
  } else {
    // JS fallback: clear to white after resize (canvas clears on dimension change)
    jsClearCanvas();
  }
}

/**
 * Pointer down — start a drawing stroke.
 * @param {{ x: number, y: number, button: number, buttons: number }} event
 */
export function onPointerDown(event) {
  isDrawing = true;
  lastX = event.x;
  lastY = event.y;
}

/**
 * Pointer move — continue the stroke if drawing.
 * @param {{ x: number, y: number, button: number, buttons: number }} event
 */
export function onPointerMove(event) {
  if (!isDrawing || event.buttons === 0) {
    isDrawing = false;
    return;
  }

  const currentX = event.x;
  const currentY = event.y;

  if (useWasmPixelBuffer && pixelBuffer) {
    const { r, g, b, a } = hexToRGBA(brushColor);
    wasm_draw_line(
      Math.round(lastX),
      Math.round(lastY),
      Math.round(currentX),
      Math.round(currentY),
      r, g, b, a,
      brushSize,
    );
  } else {
    jsDrawLine(lastX, lastY, currentX, currentY);
  }

  lastX = currentX;
  lastY = currentY;
}

/**
 * Pointer up — end the stroke.
 * @param {{ x: number, y: number, button: number, buttons: number }} event
 */
export function onPointerUp(event) {
  isDrawing = false;
}

/**
 * Key down handler.
 * @param {{ key: string, code: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, metaKey: boolean }} event
 * @returns {boolean} true if the key was handled
 */
export function onKeyDown(event) {
  // C key — clear canvas
  if (event.key === 'c' || event.key === 'C') {
    if (!event.ctrlKey && !event.metaKey) {
      detectTheme();
      if (useWasmPixelBuffer && pixelBuffer) {
        wasm_clear_canvas(bgR, bgG, bgB, 255);
        flushPixelBuffer();
      } else {
        jsClearCanvas();
      }
      return true;
    }
  }

  return false;
}

/**
 * Cleanup the adapter.
 */
export function dispose() {
  ctx = null;
  canvasEl = null;
  wasmInstance = null;
  pixelBuffer = null;
  sdkRef = null;
  isDrawing = false;
  useWasmPixelBuffer = false;
}
