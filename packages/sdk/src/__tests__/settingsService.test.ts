import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetValue, mockSetValue, mockOnSettingChanged } = vi.hoisted(() => ({
  mockGetValue: vi.fn(),
  mockSetValue: vi.fn(),
  mockOnSettingChanged: vi.fn(() => vi.fn()),
}));

vi.mock('@archbase/workspace-state', () => ({
  useSettingsStore: { getState: () => ({ getValue: mockGetValue, setValue: mockSetValue }) },
  onSettingChanged: mockOnSettingChanged,
}));

import { createSettingsService } from '../services/settingsService';

describe('createSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('get returns the setting value from the store', () => {
    mockGetValue.mockReturnValue('dark');
    const service = createSettingsService();

    const result = service.get('theme.mode');

    expect(mockGetValue).toHaveBeenCalledWith('theme.mode');
    expect(result).toBe('dark');
  });

  it('get returns undefined for a missing key', () => {
    mockGetValue.mockReturnValue(undefined);
    const service = createSettingsService();

    const result = service.get('nonexistent.key');

    expect(mockGetValue).toHaveBeenCalledWith('nonexistent.key');
    expect(result).toBeUndefined();
  });

  it('set calls setValue on the store', () => {
    const service = createSettingsService();

    service.set('theme.mode', 'light');

    expect(mockSetValue).toHaveBeenCalledWith('theme.mode', 'light');
  });

  it('onChange registers a handler via onSettingChanged', () => {
    const service = createSettingsService();
    const handler = vi.fn();

    service.onChange('theme.mode', handler);

    expect(mockOnSettingChanged).toHaveBeenCalledWith('theme.mode', handler);
  });

  it('onChange returns an unsubscribe function', () => {
    const mockUnsubscribe = vi.fn();
    mockOnSettingChanged.mockReturnValue(mockUnsubscribe);
    const service = createSettingsService();
    const handler = vi.fn();

    const unsubscribe = service.onChange('theme.mode', handler);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
