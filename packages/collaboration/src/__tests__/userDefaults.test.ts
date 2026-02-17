import { describe, it, expect } from 'vitest';
import { resolveUser, pickColor, CURSOR_PALETTE } from '../utils/userDefaults';

describe('userDefaults', () => {
  describe('resolveUser', () => {
    it('generates a complete user from empty partial', () => {
      const user = resolveUser();
      expect(user.id).toBeDefined();
      expect(user.id.length).toBeGreaterThan(0);
      expect(user.displayName).toMatch(/^User \d+$/);
      expect(CURSOR_PALETTE).toContain(user.color);
    });

    it('preserves provided fields', () => {
      const user = resolveUser({
        id: 'custom-id',
        displayName: 'Alice',
        color: '#ff0000',
        avatar: 'https://example.com/avatar.png',
      });

      expect(user.id).toBe('custom-id');
      expect(user.displayName).toBe('Alice');
      expect(user.color).toBe('#ff0000');
      expect(user.avatar).toBe('https://example.com/avatar.png');
    });

    it('fills in missing fields from partial', () => {
      const user = resolveUser({ displayName: 'Bob' });
      expect(user.id).toBeDefined();
      expect(user.displayName).toBe('Bob');
      expect(CURSOR_PALETTE).toContain(user.color);
    });
  });

  describe('pickColor', () => {
    it('returns a color from palette by index', () => {
      expect(pickColor(0)).toBe(CURSOR_PALETTE[0]);
      expect(pickColor(1)).toBe(CURSOR_PALETTE[1]);
    });

    it('wraps around palette length', () => {
      expect(pickColor(8)).toBe(CURSOR_PALETTE[0]);
      expect(pickColor(9)).toBe(CURSOR_PALETTE[1]);
    });
  });

  describe('CURSOR_PALETTE', () => {
    it('has 8 colors', () => {
      expect(CURSOR_PALETTE.length).toBe(8);
    });

    it('all colors are hex strings', () => {
      for (const color of CURSOR_PALETTE) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });
});
