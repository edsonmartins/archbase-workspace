import type { SnapZone, SnapPosition } from '@archbase/workspace-types';

/** Distance from viewport edge that triggers snap detection */
export const EDGE_THRESHOLD = 20;

/** Size of corner hit areas (square) */
const CORNER_SIZE = EDGE_THRESHOLD * 2;

/**
 * Compute all snap zones for the given viewport dimensions.
 * Returns 9 zones: 4 edges (halves), 4 corners (quarters), and maximize (top center).
 * Returns empty array if viewport is too small for meaningful snap zones.
 */
export function computeSnapZones(
  viewportWidth: number,
  viewportHeight: number,
  taskbarHeight: number,
): SnapZone[] {
  // Reject invalid inputs
  if (
    !Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) ||
    !Number.isFinite(taskbarHeight) || viewportWidth < 0 || viewportHeight < 0 || taskbarHeight < 0
  ) {
    return [];
  }

  const availH = viewportHeight - taskbarHeight;

  // Viewport too small for meaningful snap zones
  if (availH < CORNER_SIZE * 2 || viewportWidth < CORNER_SIZE * 2) {
    return [];
  }

  const halfW = Math.floor(viewportWidth / 2);
  const halfH = Math.floor(availH / 2);

  const edgeHitH = Math.max(0, availH - CORNER_SIZE * 2);
  const edgeHitW = Math.max(0, viewportWidth - CORNER_SIZE * 2);

  const zones: SnapZone[] = [
    // --- Corners (checked first for priority) ---
    {
      position: 'top-left',
      bounds: { x: 0, y: 0, width: halfW, height: halfH },
      hitArea: { x: 0, y: 0, width: CORNER_SIZE, height: CORNER_SIZE },
    },
    {
      position: 'top-right',
      bounds: { x: halfW, y: 0, width: viewportWidth - halfW, height: halfH },
      hitArea: { x: viewportWidth - CORNER_SIZE, y: 0, width: CORNER_SIZE, height: CORNER_SIZE },
    },
    {
      position: 'bottom-left',
      bounds: { x: 0, y: halfH, width: halfW, height: availH - halfH },
      hitArea: { x: 0, y: availH - CORNER_SIZE, width: CORNER_SIZE, height: CORNER_SIZE },
    },
    {
      position: 'bottom-right',
      bounds: { x: halfW, y: halfH, width: viewportWidth - halfW, height: availH - halfH },
      hitArea: {
        x: viewportWidth - CORNER_SIZE,
        y: availH - CORNER_SIZE,
        width: CORNER_SIZE,
        height: CORNER_SIZE,
      },
    },

    // --- Edges (halves) — hit area excludes corners ---
    {
      position: 'left',
      bounds: { x: 0, y: 0, width: halfW, height: availH },
      hitArea: { x: 0, y: CORNER_SIZE, width: EDGE_THRESHOLD, height: edgeHitH },
    },
    {
      position: 'right',
      bounds: { x: halfW, y: 0, width: viewportWidth - halfW, height: availH },
      hitArea: {
        x: viewportWidth - EDGE_THRESHOLD,
        y: CORNER_SIZE,
        width: EDGE_THRESHOLD,
        height: edgeHitH,
      },
    },
    {
      position: 'top',
      bounds: { x: 0, y: 0, width: viewportWidth, height: halfH },
      hitArea: {
        x: CORNER_SIZE,
        y: 0,
        width: edgeHitW,
        height: EDGE_THRESHOLD,
      },
    },
    {
      position: 'bottom',
      bounds: { x: 0, y: halfH, width: viewportWidth, height: availH - halfH },
      hitArea: {
        x: CORNER_SIZE,
        y: availH - EDGE_THRESHOLD,
        width: edgeHitW,
        height: EDGE_THRESHOLD,
      },
    },

    // --- Maximize (top center strip, narrower than full top edge) ---
    {
      position: 'maximize',
      bounds: { x: 0, y: 0, width: viewportWidth, height: availH },
      hitArea: {
        x: Math.floor(viewportWidth / 4),
        y: 0,
        width: Math.floor(viewportWidth / 2),
        height: EDGE_THRESHOLD / 2,
      },
    },
  ];

  return zones;
}

function hitTest(x: number, y: number, area: SnapZone['hitArea']): boolean {
  return (
    x >= area.x &&
    x < area.x + area.width &&
    y >= area.y &&
    y < area.y + area.height
  );
}

/**
 * Find the snap zone at the given cursor position.
 * Corners have priority over edges. Maximize has priority over top edge.
 * Returns null if cursor is not in any snap zone.
 */
export function getSnapZoneAtPosition(
  x: number,
  y: number,
  zones: SnapZone[],
): SnapZone | null {
  // Zones are ordered: corners first, then edges, then maximize.
  // Check maximize first (highest priority when cursor at very top center).
  const maximize = zones.find((z) => z.position === 'maximize');
  if (maximize && hitTest(x, y, maximize.hitArea)) return maximize;

  // Then check corners (higher priority than edges).
  const cornerPositions: SnapPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  for (const zone of zones) {
    if (cornerPositions.includes(zone.position) && hitTest(x, y, zone.hitArea)) {
      return zone;
    }
  }

  // Then edges.
  const edgePositions: SnapPosition[] = ['left', 'right', 'top', 'bottom'];
  for (const zone of zones) {
    if (edgePositions.includes(zone.position) && hitTest(x, y, zone.hitArea)) {
      return zone;
    }
  }

  return null;
}
