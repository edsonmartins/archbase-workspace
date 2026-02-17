import { describe, it, expect } from 'vitest';
import { evaluateWhen } from '../whenEvaluator';

describe('evaluateWhen', () => {
  it('returns true for empty expression', () => {
    expect(evaluateWhen('', {})).toBe(true);
  });

  it('returns true for whitespace-only expression', () => {
    expect(evaluateWhen('   ', {})).toBe(true);
  });

  it('matches key == value when equal', () => {
    expect(evaluateWhen('theme == dark', { theme: 'dark' })).toBe(true);
  });

  it('does not match key == value when not equal', () => {
    expect(evaluateWhen('theme == dark', { theme: 'light' })).toBe(false);
  });

  it('matches key != value when not equal', () => {
    expect(evaluateWhen('theme != dark', { theme: 'light' })).toBe(true);
  });

  it('does not match key != value when equal', () => {
    expect(evaluateWhen('theme != dark', { theme: 'dark' })).toBe(false);
  });

  it('truthy check returns true for existing truthy key', () => {
    expect(evaluateWhen('isLoggedIn', { isLoggedIn: true })).toBe(true);
  });

  it('truthy check returns false for missing key', () => {
    expect(evaluateWhen('isLoggedIn', {})).toBe(false);
  });

  it('falsy check with !key returns true for missing key', () => {
    expect(evaluateWhen('!isLoggedIn', {})).toBe(true);
  });

  it('falsy check with !key returns false for truthy key', () => {
    expect(evaluateWhen('!isLoggedIn', { isLoggedIn: true })).toBe(false);
  });

  it('evaluates multiple conditions with && all true', () => {
    expect(
      evaluateWhen('theme == dark && isLoggedIn', {
        theme: 'dark',
        isLoggedIn: true,
      }),
    ).toBe(true);
  });

  it('evaluates multiple conditions with && one false', () => {
    expect(
      evaluateWhen('theme == dark && isLoggedIn', {
        theme: 'light',
        isLoggedIn: true,
      }),
    ).toBe(false);
  });
});
