import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { usePermissionsStore } from '@archbase/workspace-state';
import type { PendingPrompt } from '@archbase/workspace-state';
import { PermissionPrompt } from '../PermissionPrompt';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function resetStore() {
  usePermissionsStore.setState({
    grants: new Map(),
    pendingPrompt: null,
    promptQueue: [],
  });
}

beforeEach(() => {
  resetStore();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderSync(element: React.ReactNode) {
  act(() => root.render(element));
}

function makePrompt(overrides: Partial<PendingPrompt> = {}): PendingPrompt {
  return {
    id: 'prompt-test',
    appId: 'test-app',
    appDisplayName: 'Test App',
    appIcon: '🔔',
    permission: 'notifications',
    resolve: vi.fn(),
    ...overrides,
  };
}

describe('PermissionPrompt', () => {
  it('renders nothing when no pending prompt', () => {
    renderSync(<PermissionPrompt />);
    expect(container.querySelector('.permission-prompt-overlay')).toBeNull();
  });

  it('renders prompt UI when there is a pending prompt', () => {
    usePermissionsStore.setState({ pendingPrompt: makePrompt() });
    renderSync(<PermissionPrompt />);

    const dialog = container.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    expect(container.textContent).toContain('Test App');
    expect(container.textContent).toContain('🔔');
    expect(container.textContent).toContain('Show Notifications');
    expect(container.textContent).toContain('This app wants to display desktop notifications.');
    expect(container.querySelector('.permission-prompt-deny')).toBeTruthy();
    expect(container.querySelector('.permission-prompt-allow')).toBeTruthy();
  });

  it('calls resolvePrompt with granted when Allow is clicked', () => {
    const resolvePromptSpy = vi.fn();
    usePermissionsStore.setState({
      pendingPrompt: makePrompt(),
      resolvePrompt: resolvePromptSpy,
    });
    renderSync(<PermissionPrompt />);

    const allowBtn = container.querySelector('.permission-prompt-allow') as HTMLButtonElement;
    act(() => allowBtn.click());

    expect(resolvePromptSpy).toHaveBeenCalledWith('granted');
  });

  it('calls resolvePrompt with denied when Deny is clicked', () => {
    const resolvePromptSpy = vi.fn();
    usePermissionsStore.setState({
      pendingPrompt: makePrompt({ permission: 'storage' }),
      resolvePrompt: resolvePromptSpy,
    });
    renderSync(<PermissionPrompt />);

    const denyBtn = container.querySelector('.permission-prompt-deny') as HTMLButtonElement;
    act(() => denyBtn.click());

    expect(resolvePromptSpy).toHaveBeenCalledWith('denied');
  });

  it('has correct accessibility attributes', () => {
    usePermissionsStore.setState({ pendingPrompt: makePrompt({ permission: 'camera' }) });
    renderSync(<PermissionPrompt />);

    const dialog = container.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Permission Request');
    expect(dialog.getAttribute('aria-describedby')).toBe('permission-prompt-desc');

    const desc = container.querySelector('#permission-prompt-desc');
    expect(desc).toBeTruthy();
    expect(desc?.textContent).toContain('This app wants to access your camera.');
  });

  it('calls resolvePrompt with denied on Escape key', () => {
    const resolvePromptSpy = vi.fn();
    usePermissionsStore.setState({
      pendingPrompt: makePrompt(),
      resolvePrompt: resolvePromptSpy,
    });
    renderSync(<PermissionPrompt />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(resolvePromptSpy).toHaveBeenCalledWith('denied');
  });

  it('removes from DOM after prompt is cleared', () => {
    usePermissionsStore.setState({ pendingPrompt: makePrompt() });
    renderSync(<PermissionPrompt />);
    expect(container.querySelector('.permission-prompt-overlay')).toBeTruthy();

    // Clear prompt
    usePermissionsStore.setState({ pendingPrompt: null });
    renderSync(<PermissionPrompt />);
    expect(container.querySelector('.permission-prompt-overlay')).toBeNull();
  });
});
