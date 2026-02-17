import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// ============================================================
// Mock for asyncStorageService
// ============================================================

const mockGet = vi.fn().mockResolvedValue(null);
const mockSet = vi.fn().mockResolvedValue(undefined);

vi.mock('../services/asyncStorageService', () => ({
  createAsyncStorageService: () => ({ get: mockGet, set: mockSet }),
}));

import { useAsyncStorage } from '../hooks/useAsyncStorage';

// ============================================================
// Helpers
// ============================================================

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ============================================================
// DOM helpers
// ============================================================

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockGet.mockReset().mockResolvedValue(null);
  mockSet.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

// ============================================================
// useAsyncStorage
// ============================================================

describe('useAsyncStorage', () => {
  it('starts with default value and isLoading=true', () => {
    // Intentionally never resolve so loading stays true during this test
    mockGet.mockReturnValue(new Promise(() => {}));

    let result: [string, (v: string) => void, boolean] | undefined;

    function Consumer() {
      result = useAsyncStorage<string>('my-app', 'key1', 'default-val');
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    expect(result).toBeDefined();
    expect(result![0]).toBe('default-val');
    expect(result![2]).toBe(true);
  });

  it('updates to stored value after IDB read completes', async () => {
    mockGet.mockResolvedValue('stored-value');

    let result: [string, (v: string) => void, boolean] | undefined;

    function Consumer() {
      result = useAsyncStorage<string>('my-app', 'key1', 'default-val');
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    // Initially shows default
    expect(result![0]).toBe('default-val');

    // Wait for async IDB read to complete
    await act(async () => {
      await flushPromises();
    });

    expect(result![0]).toBe('stored-value');
    expect(result![2]).toBe(false);
  });

  it('stays on default when IDB returns null', async () => {
    mockGet.mockResolvedValue(null);

    let result: [string, (v: string) => void, boolean] | undefined;

    function Consumer() {
      result = useAsyncStorage<string>('my-app', 'key1', 'fallback');
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    await act(async () => {
      await flushPromises();
    });

    // Value remains default since IDB returned null
    expect(result![0]).toBe('fallback');
    expect(result![2]).toBe(false);
  });

  it('setValue updates local state and calls IDB set', async () => {
    mockGet.mockResolvedValue(null);

    let result: [number, (v: number) => void, boolean] | undefined;

    function Consumer() {
      result = useAsyncStorage<number>('my-app', 'counter', 0);
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    await act(async () => {
      await flushPromises();
    });

    expect(result![0]).toBe(0);

    // Call setValue
    act(() => {
      result![1](42);
    });

    // Local state should update immediately
    expect(result![0]).toBe(42);

    // IDB set should have been called
    expect(mockSet).toHaveBeenCalledWith('counter', 42);
  });

  it('handles IDB errors gracefully', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGet.mockRejectedValue(new Error('IDB unavailable'));

    let result: [string, (v: string) => void, boolean] | undefined;

    function Consumer() {
      result = useAsyncStorage<string>('my-app', 'key1', 'safe-default');
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    await act(async () => {
      await flushPromises();
    });

    // Should fall back to default value
    expect(result![0]).toBe('safe-default');
    // Should no longer be loading
    expect(result![2]).toBe(false);
    // Warning should have been logged
    expect(consoleWarn).toHaveBeenCalled();

    consoleWarn.mockRestore();
  });
});
