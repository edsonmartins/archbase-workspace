import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CommandPalette } from '../CommandPalette';

// Mock the command registry store
vi.mock('@archbase/workspace-state', () => {
  const mockCommands = [
    {
      id: 'test.greet',
      title: 'Greet',
      category: 'Test',
      icon: '👋',
      enabled: true,
      keybinding: 'Cmd+G',
      handler: vi.fn(),
    },
    {
      id: 'test.farewell',
      title: 'Farewell',
      category: 'Test',
      icon: '🫡',
      enabled: true,
      handler: vi.fn(),
    },
  ];

  return {
    useCommandRegistryStore: Object.assign(
      (selector: (s: unknown) => unknown) =>
        selector({
          getAllCommands: () => mockCommands,
        }),
      {
        getState: () => ({
          execute: vi.fn().mockResolvedValue(undefined),
        }),
      },
    ),
  };
});

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

function renderPalette(visible: boolean, onClose = vi.fn()) {
  act(() => {
    root.render(<CommandPalette visible={visible} onClose={onClose} />);
  });
  return onClose;
}

describe('CommandPalette', () => {
  it('renders nothing when not visible', () => {
    renderPalette(false);
    expect(container.innerHTML).toBe('');
  });

  it('has role="dialog" and aria-modal on overlay', () => {
    renderPalette(true);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    expect(dialog!.getAttribute('aria-label')).toBe('Command Palette');
  });

  it('input has combobox role and ARIA attributes', () => {
    renderPalette(true);
    const input = container.querySelector('[role="combobox"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe('command-palette-listbox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
  });

  it('results container has listbox role', () => {
    renderPalette(true);
    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    expect(listbox!.getAttribute('aria-label')).toBe('Commands');
    expect(listbox!.id).toBe('command-palette-listbox');
  });

  it('each command has role="option" with id and aria-selected', () => {
    renderPalette(true);
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(2);
    // First is selected by default
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[0].id).toBe('cmd-test.greet');
    expect(options[1].getAttribute('aria-selected')).toBe('false');
    expect(options[1].id).toBe('cmd-test.farewell');
  });

  it('activedescendant points to selected option', () => {
    renderPalette(true);
    const input = container.querySelector('[role="combobox"]') as HTMLInputElement;
    expect(input.getAttribute('aria-activedescendant')).toBe('cmd-test.greet');
  });

  it('calls onClose on Escape', () => {
    const onClose = renderPalette(true);
    const card = container.querySelector('.command-palette-card')!;
    act(() => {
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
