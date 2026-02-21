import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { AppManifest, WasmKeyEvent, WasmPointerEvent } from '@archbase/workspace-types';
import { createSecureSDK, useTheme } from '@archbase/workspace-sdk';
import {
  loadWasmModule,
  destroyWasmRuntime,
  getWasmRuntime,
} from '../services/wasmLoader';
import { ShadowContainer } from './ShadowContainer';

interface WasmAppProps {
  appId: string;
  windowId: string;
  manifest: AppManifest;
}

export function WasmApp({ appId, windowId, manifest }: WasmAppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const { isDark } = useTheme();

  if (!manifest.wasm) {
    return null;
  }

  const config = manifest.wasm;
  const displayName = manifest.displayName ?? manifest.name;
  const needsCanvas = config.renderMode !== 'dom';
  const needsDom = config.renderMode === 'dom' || config.renderMode === 'hybrid';
  const useShadow =
    manifest.isolation?.css === 'shadow' || manifest.isolation?.css === true;

  const sdk = useMemo(
    () => createSecureSDK(appId, windowId, manifest),
    [appId, windowId, manifest],
  );

  // ── Load WASM module ──
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container) return;

    setStatus('loading');
    setError(null);

    loadWasmModule(config, windowId, container, canvas)
      .then((runtime) => {
        if (cancelled) {
          destroyWasmRuntime(windowId);
          return;
        }

        // Inject SDK
        runtime.api.setSDK?.(sdk);
        setStatus('ready');

        // Auto-focus container for keyboard input
        containerRef.current?.focus();

        // Start animation loop for canvas modes — read from cache to avoid stale closure
        if (needsCanvas && runtime.api.render) {
          const loop = (ts: number) => {
            const rt = getWasmRuntime(windowId);
            if (rt?.api.render) {
              try {
                rt.api.render(ts);
                animFrameRef.current = requestAnimationFrame(loop);
              } catch (renderErr) {
                // Render crash: surface to UI and stop the loop
                const err = renderErr instanceof Error ? renderErr : new Error(String(renderErr));
                console.error(`[WasmApp] Render loop crashed for "${displayName}":`, err);
                setError(err);
                setStatus('error');
                // Do NOT schedule another frame — loop terminates here
              }
            }
          };
          animFrameRef.current = requestAnimationFrame(loop);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      destroyWasmRuntime(windowId);
    };
  }, [config, windowId, sdk, needsCanvas, retryKey]);

  // ── Resize observer ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;

      // Resize canvas to match container
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = globalThis.devicePixelRatio ?? 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      // Notify WASM app
      const runtime = getWasmRuntime(windowId);
      runtime?.api.resize?.(width, height);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [windowId]);

  // ── Input forwarding ──
  // Read runtime from cache to avoid stale closure after retry
  useEffect(() => {
    const el = containerRef.current;
    if (!el || status !== 'ready') return;

    const toLocal = (e: PointerEvent): WasmPointerEvent => {
      const rect = el.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        button: e.button,
        buttons: e.buttons,
      };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const consumed = getWasmRuntime(windowId)?.api.onKeyDown?.(toKeyEvent(e));
      if (consumed) e.preventDefault();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const consumed = getWasmRuntime(windowId)?.api.onKeyUp?.(toKeyEvent(e));
      if (consumed) e.preventDefault();
    };

    const onPointerDown = (e: PointerEvent) =>
      getWasmRuntime(windowId)?.api.onPointerDown?.(toLocal(e));
    const onPointerMove = (e: PointerEvent) =>
      getWasmRuntime(windowId)?.api.onPointerMove?.(toLocal(e));
    const onPointerUp = (e: PointerEvent) =>
      getWasmRuntime(windowId)?.api.onPointerUp?.(toLocal(e));
    const onWheel = (e: WheelEvent) => {
      const consumed = getWasmRuntime(windowId)?.api.onWheel?.(
        { deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ },
      );
      if (consumed) e.preventDefault();
    };

    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('keyup', onKeyUp);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('keyup', onKeyUp);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [windowId, status, retryKey]);

  // ── Focus/blur forwarding ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el || status !== 'ready') return;

    const onFocus = () => getWasmRuntime(windowId)?.api.onFocus?.();
    const onBlur = () => getWasmRuntime(windowId)?.api.onBlur?.();

    el.addEventListener('focus', onFocus);
    el.addEventListener('blur', onBlur);

    return () => {
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
    };
  }, [windowId, status, retryKey]);

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  if (status === 'error') {
    return (
      <div className="remote-app-error">
        <span className="remote-app-error-icon" aria-hidden="true">!!!</span>
        <span>Failed to load {displayName}</span>
        <span className="remote-app-error-detail">{error?.message}</span>
        <button className="remote-app-retry-btn" onClick={handleRetry}>
          Retry
        </button>
      </div>
    );
  }

  const content = (
    <div
      ref={containerRef}
      className="wasm-app-container"
      style={{ width: '100%', height: '100%', position: 'relative', background: isDark ? '#1e293b' : '#ffffff' }}
      tabIndex={0}
    >
      {status === 'loading' && (
        <div className="remote-app-loading">Loading {displayName}...</div>
      )}
      {needsCanvas && (
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: needsDom ? '50%' : '100%',
          }}
        />
      )}
      {needsDom && (
        <div
          className="wasm-dom-container"
          style={{
            width: '100%',
            height: needsCanvas ? '50%' : '100%',
            overflow: 'auto',
          }}
        />
      )}
    </div>
  );

  return useShadow ? <ShadowContainer>{content}</ShadowContainer> : content;
}

// ── Helpers ──

function toKeyEvent(e: KeyboardEvent): WasmKeyEvent {
  return {
    key: e.key,
    code: e.code,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
  };
}
