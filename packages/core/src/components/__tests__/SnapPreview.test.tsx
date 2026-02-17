import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { SnapPreview } from '../SnapPreview';

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

function renderSnapPreview(zone: import('@archbase/workspace-types').SnapZone | null) {
  act(() => {
    root.render(<SnapPreview zone={zone} />);
  });
}

function makeZone(position: import('@archbase/workspace-types').SnapPosition = 'left') {
  return {
    position,
    bounds: { x: 0, y: 0, width: 500, height: 800 },
    hitArea: { x: 0, y: 0, width: 10, height: 800 },
  };
}

describe('SnapPreview', () => {
  it('renders null when zone is null', () => {
    renderSnapPreview(null);
    expect(container.innerHTML).toBe('');
  });

  it('renders snap preview div with correct position/size', () => {
    const zone = makeZone('left');
    renderSnapPreview(zone);
    const preview = container.querySelector('.snap-preview') as HTMLDivElement;
    expect(preview).not.toBeNull();
    expect(preview.style.left).toBe('0px');
    expect(preview.style.top).toBe('0px');
    expect(preview.style.width).toBe('500px');
    expect(preview.style.height).toBe('800px');
    expect(preview.style.position).toBe('absolute');
  });

  it('has aria-hidden="true"', () => {
    const zone = makeZone('left');
    renderSnapPreview(zone);
    const preview = container.querySelector('.snap-preview')!;
    expect(preview.getAttribute('aria-hidden')).toBe('true');
  });
});
