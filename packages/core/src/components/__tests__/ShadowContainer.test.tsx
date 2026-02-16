import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ShadowContainer } from '../ShadowContainer';

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

function renderSync(element: React.ReactNode) {
  act(() => root.render(element));
}

describe('ShadowContainer', () => {
  it('creates a shadow root on the host element', () => {
    renderSync(
      <ShadowContainer>
        <div>Test</div>
      </ShadowContainer>,
    );

    const host = container.querySelector('.shadow-host');
    expect(host).toBeTruthy();
    expect(host?.shadowRoot).toBeTruthy();
    expect(host?.shadowRoot?.mode).toBe('open');
  });

  it('renders children inside the shadow DOM', () => {
    renderSync(
      <ShadowContainer>
        <span>Hello Shadow</span>
      </ShadowContainer>,
    );

    const host = container.querySelector('.shadow-host');
    const shadow = host?.shadowRoot;
    expect(shadow?.textContent).toContain('Hello Shadow');
  });

  it('injects style element when styles prop is provided', () => {
    renderSync(
      <ShadowContainer styles=".test { color: red; }">
        <div>Styled</div>
      </ShadowContainer>,
    );

    const shadow = container.querySelector('.shadow-host')?.shadowRoot;
    const styleEl = shadow?.querySelector('style');
    expect(styleEl).toBeTruthy();
    expect(styleEl?.textContent).toBe('.test { color: red; }');
  });

  it('does not inject style element when styles is undefined', () => {
    renderSync(
      <ShadowContainer>
        <div>Unstyled</div>
      </ShadowContainer>,
    );

    const shadow = container.querySelector('.shadow-host')?.shadowRoot;
    expect(shadow?.querySelector('style')).toBeNull();
  });

  it('host element has correct class and full dimensions', () => {
    renderSync(
      <ShadowContainer>
        <div>Content</div>
      </ShadowContainer>,
    );

    const host = container.querySelector('.shadow-host') as HTMLDivElement;
    expect(host.className).toBe('shadow-host');
    expect(host.style.width).toBe('100%');
    expect(host.style.height).toBe('100%');
  });

  it('handles React StrictMode double-mount without error', () => {
    renderSync(
      <React.StrictMode>
        <ShadowContainer>
          <div>StrictMode Content</div>
        </ShadowContainer>
      </React.StrictMode>,
    );

    const host = container.querySelector('.shadow-host');
    expect(host).toBeTruthy();
    expect(host?.shadowRoot).toBeTruthy();
    expect(host?.shadowRoot?.textContent).toContain('StrictMode Content');
  });
});
