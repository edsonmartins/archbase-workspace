import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useFocusTrap } from '../useFocusTrap';

// ── Test scaffolding ──────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// ── Helper component ──────────────────────────────────────

function TrapComponent({
  active,
  trapRef,
}: {
  active: boolean;
  trapRef: React.RefObject<HTMLDivElement | null>;
}) {
  useFocusTrap(trapRef, active);
  return (
    React.createElement('div', { ref: trapRef },
      React.createElement('button', null, 'First'),
      React.createElement('button', null, 'Second'),
      React.createElement('button', null, 'Last'),
    )
  );
}

// ── Tests ─────────────────────────────────────────────────

describe('useFocusTrap', () => {
  it('does not trap when active is false', () => {
    const trapRef: React.RefObject<HTMLDivElement | null> = { current: null };
    const addEventSpy = vi.spyOn(document.createElement('div'), 'addEventListener');

    act(() => {
      root.render(React.createElement(TrapComponent, { active: false, trapRef }));
    });

    // No keydown listener added since active=false
    expect(trapRef.current).not.toBeNull();
    // Verify no keydown listener was attached to the container
    const kbHandler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') e.preventDefault();
    };
    // The hook should not have added any listener — Tab should NOT be captured
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const prevented = { value: false };
    tab.preventDefault = () => { prevented.value = true; };
    trapRef.current!.dispatchEvent(tab);
    // Since not active, the trap's keydown handler is not registered
    expect(prevented.value).toBe(false);

    addEventSpy.mockRestore();
  });

  it('wraps Tab from last to first focusable element', () => {
    const trapRef: React.RefObject<HTMLDivElement | null> = { current: null };

    act(() => {
      root.render(React.createElement(TrapComponent, { active: true, trapRef }));
    });

    const buttons = trapRef.current!.querySelectorAll<HTMLButtonElement>('button');
    const last = buttons[buttons.length - 1];

    // Focus the last button
    act(() => {
      last.focus();
    });

    expect(document.activeElement).toBe(last);

    // Fire Tab on the container (not shift)
    const tab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true, cancelable: true });
    act(() => {
      trapRef.current!.dispatchEvent(tab);
    });

    // Focus should have moved to first
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps Shift+Tab from first to last focusable element', () => {
    const trapRef: React.RefObject<HTMLDivElement | null> = { current: null };

    act(() => {
      root.render(React.createElement(TrapComponent, { active: true, trapRef }));
    });

    const buttons = trapRef.current!.querySelectorAll<HTMLButtonElement>('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    // Focus the first button
    act(() => {
      first.focus();
    });

    expect(document.activeElement).toBe(first);

    // Fire Shift+Tab on the container
    const shiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    act(() => {
      trapRef.current!.dispatchEvent(shiftTab);
    });

    // Focus should have moved to last
    expect(document.activeElement).toBe(last);
  });

  it('does not interfere with non-Tab keys', () => {
    const trapRef: React.RefObject<HTMLDivElement | null> = { current: null };

    act(() => {
      root.render(React.createElement(TrapComponent, { active: true, trapRef }));
    });

    const buttons = trapRef.current!.querySelectorAll<HTMLButtonElement>('button');
    act(() => { buttons[0].focus(); });

    const prevented = { value: false };
    const enterKey = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    enterKey.preventDefault = () => { prevented.value = true; };
    act(() => {
      trapRef.current!.dispatchEvent(enterKey);
    });

    // preventDefault should not be called for non-Tab keys by the trap
    expect(prevented.value).toBe(false);
  });

  it('removes keydown listener on deactivation', () => {
    const trapRef: React.RefObject<HTMLDivElement | null> = { current: null };
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener');

    act(() => {
      root.render(React.createElement(TrapComponent, { active: true, trapRef }));
    });

    // Listener should have been added
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    act(() => {
      root.render(React.createElement(TrapComponent, { active: false, trapRef }));
    });

    // Listener should have been removed
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
