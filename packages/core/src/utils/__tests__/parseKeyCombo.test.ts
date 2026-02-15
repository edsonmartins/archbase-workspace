import { describe, it, expect } from 'vitest';
import { parseKeyCombo, matchesKeyCombo, formatKeyCombo } from '../parseKeyCombo';

describe('parseKeyCombo', () => {
  it('parses a single key', () => {
    expect(parseKeyCombo('Escape')).toEqual({ key: 'escape' });
  });

  it('parses F-keys', () => {
    expect(parseKeyCombo('F1')).toEqual({ key: 'f1' });
  });

  it('parses Cmd+K', () => {
    expect(parseKeyCombo('Cmd+K')).toEqual({ key: 'k', meta: true });
  });

  it('parses Ctrl+K', () => {
    expect(parseKeyCombo('Ctrl+K')).toEqual({ key: 'k', ctrl: true });
  });

  it('parses Ctrl+Shift+N', () => {
    expect(parseKeyCombo('Ctrl+Shift+N')).toEqual({ key: 'n', ctrl: true, shift: true });
  });

  it('parses Alt+Tab', () => {
    expect(parseKeyCombo('Alt+Tab')).toEqual({ key: 'tab', alt: true });
  });

  it('parses Meta+Shift+`', () => {
    expect(parseKeyCombo('Meta+Shift+`')).toEqual({ key: '`', meta: true, shift: true });
  });

  it('is case-insensitive', () => {
    expect(parseKeyCombo('cmd+k')).toEqual(parseKeyCombo('Cmd+K'));
    expect(parseKeyCombo('CTRL+SHIFT+N')).toEqual(parseKeyCombo('Ctrl+Shift+N'));
  });

  it('parses Command as meta', () => {
    expect(parseKeyCombo('Command+Z')).toEqual({ key: 'z', meta: true });
  });

  it('parses Control as ctrl', () => {
    expect(parseKeyCombo('Control+Z')).toEqual({ key: 'z', ctrl: true });
  });

  it('parses Option as alt', () => {
    expect(parseKeyCombo('Option+A')).toEqual({ key: 'a', alt: true });
  });

  it('handles whitespace around parts', () => {
    expect(parseKeyCombo('Cmd + K')).toEqual({ key: 'k', meta: true });
  });

  it('throws on empty string', () => {
    expect(() => parseKeyCombo('')).toThrow('cannot be empty');
    expect(() => parseKeyCombo('  ')).toThrow('cannot be empty');
  });

  it('throws on modifier-only combo', () => {
    expect(() => parseKeyCombo('Cmd')).toThrow('no non-modifier key');
    expect(() => parseKeyCombo('Ctrl+Shift')).toThrow('no non-modifier key');
  });

  it('throws on multiple non-modifier keys', () => {
    expect(() => parseKeyCombo('Ctrl+A+B')).toThrow('multiple non-modifier keys');
  });
});

describe('matchesKeyCombo', () => {
  function makeEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
    return {
      key: 'k',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      ...overrides,
    } as KeyboardEvent;
  }

  it('matches simple key', () => {
    const combo = parseKeyCombo('Escape');
    const event = makeEvent({ key: 'Escape' });
    expect(matchesKeyCombo(event, combo)).toBe(true);
  });

  it('matches Cmd+K', () => {
    const combo = parseKeyCombo('Cmd+K');
    const event = makeEvent({ key: 'k', metaKey: true });
    expect(matchesKeyCombo(event, combo)).toBe(true);
  });

  it('rejects when key differs', () => {
    const combo = parseKeyCombo('Cmd+K');
    const event = makeEvent({ key: 'j', metaKey: true });
    expect(matchesKeyCombo(event, combo)).toBe(false);
  });

  it('rejects when modifier missing', () => {
    const combo = parseKeyCombo('Cmd+K');
    const event = makeEvent({ key: 'k' }); // no metaKey
    expect(matchesKeyCombo(event, combo)).toBe(false);
  });

  it('rejects extra modifiers', () => {
    const combo = parseKeyCombo('Ctrl+K');
    const event = makeEvent({ key: 'k', ctrlKey: true, shiftKey: true });
    expect(matchesKeyCombo(event, combo)).toBe(false);
  });

  it('matches exact modifiers with shift', () => {
    const combo = parseKeyCombo('Ctrl+Shift+N');
    const event = makeEvent({ key: 'n', ctrlKey: true, shiftKey: true });
    expect(matchesKeyCombo(event, combo)).toBe(true);
  });

  it('is case-insensitive on event key', () => {
    const combo = parseKeyCombo('Cmd+K');
    const event = makeEvent({ key: 'K', metaKey: true });
    expect(matchesKeyCombo(event, combo)).toBe(true);
  });
});

describe('formatKeyCombo', () => {
  it('formats a simple key', () => {
    const combo = parseKeyCombo('Escape');
    expect(formatKeyCombo(combo)).toBe('Escape');
  });

  it('formats single-letter key as uppercase', () => {
    const combo = parseKeyCombo('Ctrl+K');
    // In test environment (node), IS_MAC is false so ctrl → "Ctrl"
    expect(formatKeyCombo(combo)).toBe('Ctrl+K');
  });

  it('formats all modifiers in standard order', () => {
    const combo = parseKeyCombo('Ctrl+Shift+Alt+N');
    // Non-Mac order: Ctrl, Alt, Shift, Key
    expect(formatKeyCombo(combo)).toBe('Ctrl+Alt+Shift+N');
  });

  it('formats multi-character key with capitalization', () => {
    const combo = parseKeyCombo('Escape');
    expect(formatKeyCombo(combo)).toBe('Escape');

    const combo2 = parseKeyCombo('Ctrl+Tab');
    expect(formatKeyCombo(combo2)).toBe('Ctrl+Tab');
  });
});
