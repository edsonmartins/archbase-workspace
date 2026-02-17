# ADR-004: Pointer Events API for Window Interaction

**Status**: Accepted (2025-02-15)

**Decision Makers**: Edson (CTO/Founder)

---

## Context and Problem

The Archbase Workspace desktop shell requires robust input handling for two core interactions:

1. **Window dragging** — Users drag the window header to reposition windows on the desktop
2. **Window resizing** — Users drag edge/corner handles to resize windows

These interactions must work reliably across:
- Desktop browsers (mouse)
- Tablets and touchscreens (touch)
- Pen/stylus devices (pen)
- Hybrid devices (e.g., Surface Pro with both mouse and touch)

Additionally, input must remain captured during the entire drag/resize operation, even if the pointer moves outside the window boundary or the browser viewport.

### Alternatives Considered

#### 1. **Mouse Events (`mousedown`, `mousemove`, `mouseup`)**
- Well-supported across all browsers
- **Does not handle touch or pen** — would require separate `touchstart`/`touchmove`/`touchend` handlers
- **No pointer capture** — mouse events can be lost if the pointer leaves the element
- **Double implementation** — maintaining both mouse and touch handlers is error-prone

#### 2. **Touch Events (`touchstart`, `touchmove`, `touchend`)**
- Designed for touch input
- **Touch-only** — does not handle mouse or pen
- **Complex multi-touch handling** — touch events deal with `TouchList`, which adds unnecessary complexity for single-pointer drag/resize
- Would need to be combined with Mouse Events

#### 3. **Pointer Events (`pointerdown`, `pointermove`, `pointerup`)** -- CHOSEN
- **Unified API** — single set of handlers for mouse, touch, and pen
- **Pointer capture** — `setPointerCapture()` prevents event loss during drag
- **Rich metadata** — `pointerType`, `pressure`, `tiltX`, `tiltY` for future pen features
- **W3C standard** — supported in all modern browsers (Chrome, Firefox, Safari 13+, Edge)
- **1:1 with Mouse Events** — same `clientX`, `clientY`, `button` properties; easy mental model

---

## Decision

**Use the Pointer Events API for all window drag and resize interactions.**

### Implementation: `useDrag` Hook

The `useDrag` hook handles window dragging with the following pattern:

```typescript
// packages/core/src/hooks/useDrag.ts
export function useDrag(windowId: string, options?: UseDragOptions) {
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // 1. Only left button (e.button !== 0 → ignore)
    // 2. Skip if clicking buttons or if window is maximized
    // 3. Record start position (clientX/Y and window position)
    // 4. Set document.body cursor to 'grabbing'
    // 5. Precompute snap zones for the drag session

    const onPointerMove = (moveEvent: PointerEvent) => {
      // Throttle via requestAnimationFrame
      // Calculate delta from start position
      // Constrain to viewport boundaries
      // Update window position via store
      // Detect snap zones at pointer position
    };

    const onPointerUp = () => {
      // Cancel pending rAF
      // Commit snap if active
      // Clear cursor and remove listeners
    };

    // Attach to document (not the element) for reliable capture
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [windowId, ...]);

  return { onPointerDown };
}
```

Key design decisions:
- **Document-level listeners**: `pointermove` and `pointerup` are attached to `document`, not the drag handle. This ensures events are received even when the pointer moves outside the window.
- **`requestAnimationFrame` throttling**: Position updates are batched to avoid layout thrashing during fast pointer movement.
- **Cursor override on `document.body`**: Forces `grabbing` cursor globally during drag, preventing cursor flicker when moving over other elements.
- **Snap zone precomputation**: Snap zones are calculated once on `pointerdown` and reused throughout the drag session.

### Implementation: `useResize` Hook

The `useResize` hook handles window resizing with 8 directional handles:

```typescript
// packages/core/src/hooks/useResize.ts
export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export function useResize(windowId: string) {
  const onResizePointerDown = useCallback(
    (direction: ResizeDirection, e: React.PointerEvent) => {
      // 1. Record start position and window bounds
      // 2. Set directional cursor on document.body
      // 3. Attach pointermove/pointerup to document

      const onPointerMove = (moveEvent: PointerEvent) => {
        // Throttle via requestAnimationFrame
        // Calculate delta based on direction
        // Apply min/max constraints
        // Adjust position for north/west resizing
        // Update bounds via store
      };
    },
    [windowId, setBounds, focusWindow],
  );

  const getResizeHandleProps = useCallback(
    (direction: ResizeDirection) => ({
      onPointerDown: (e: React.PointerEvent) => onResizePointerDown(direction, e),
    }),
    [onResizePointerDown],
  );

  return { getResizeHandleProps };
}
```

Key design decisions:
- **Direction-aware cursor**: Each resize direction maps to its correct CSS cursor (e.g., `ne-resize`, `sw-resize`).
- **Constraint clamping**: `minWidth`, `minHeight`, `maxWidth`, `maxHeight` from window constraints are enforced during resize.
- **Position compensation**: When resizing from the north or west edge, the window position is adjusted inversely so the opposite edge stays anchored.
- **`getResizeHandleProps` pattern**: Returns a props object per direction, making it easy to attach to 8 DOM elements.

### Cursor Map

```typescript
const cursorMap: Record<ResizeDirection, string> = {
  n:  'n-resize',
  ne: 'ne-resize',
  e:  'e-resize',
  se: 'se-resize',
  s:  's-resize',
  sw: 'sw-resize',
  w:  'w-resize',
  nw: 'nw-resize',
};
```

---

## Consequences

### Positive

1. **Single codebase** — One set of event handlers for mouse, touch, and pen. No duplicate logic.
2. **Reliable capture** — Document-level listeners prevent event loss during fast pointer movement.
3. **Cross-device support** — Works on tablets, touchscreens, and pen devices without additional code.
4. **Performance** — `requestAnimationFrame` throttling ensures 60fps during drag/resize operations.
5. **Future-proof** — Pointer Events provide `pressure`, `tiltX`, `tiltY` for potential pen-aware features.

### Negative

1. **Safari 12 and below not supported** — Pointer Events require Safari 13+.
   - Mitigated: Safari 13+ is the baseline for this project (released 2019).
2. **No `setPointerCapture` used directly** — The current implementation uses document-level listeners instead of `setPointerCapture`. This is intentional because snap zone detection requires pointer position relative to the viewport, not the captured element.

### Cleanup and Memory Safety

Both hooks implement cleanup on unmount via `useEffect` return functions and `cleanupRef` patterns to prevent:
- Dangling `pointermove`/`pointerup` listeners on `document`
- Leaked `requestAnimationFrame` callbacks
- Stale cursor overrides on `document.body`

---

## References

- [W3C Pointer Events Level 2](https://www.w3.org/TR/pointerevents2/)
- [MDN: Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- `packages/core/src/hooks/useDrag.ts` — Drag implementation
- `packages/core/src/hooks/useResize.ts` — Resize implementation

---

**Last Updated**: 2026-02-17
**Review Needed**: If multi-touch gestures (pinch-to-zoom) are added
