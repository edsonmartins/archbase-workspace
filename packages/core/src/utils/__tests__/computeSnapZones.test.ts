import { describe, it, expect } from 'vitest';
import { computeSnapZones, getSnapZoneAtPosition, EDGE_THRESHOLD } from '../computeSnapZones';

const VP_W = 1920;
const VP_H = 1080;
const TASKBAR_H = 48;
const AVAIL_H = VP_H - TASKBAR_H; // 1032

describe('computeSnapZones', () => {
  const zones = computeSnapZones(VP_W, VP_H, TASKBAR_H);

  it('returns 9 snap zones', () => {
    expect(zones).toHaveLength(9);
  });

  it('left half bounds are correct', () => {
    const left = zones.find((z) => z.position === 'left')!;
    expect(left.bounds).toEqual({ x: 0, y: 0, width: 960, height: AVAIL_H });
  });

  it('right half bounds are correct', () => {
    const right = zones.find((z) => z.position === 'right')!;
    expect(right.bounds).toEqual({ x: 960, y: 0, width: 960, height: AVAIL_H });
  });

  it('top-left quarter bounds are correct', () => {
    const tl = zones.find((z) => z.position === 'top-left')!;
    expect(tl.bounds).toEqual({ x: 0, y: 0, width: 960, height: Math.floor(AVAIL_H / 2) });
  });

  it('bottom-right quarter bounds are correct', () => {
    const br = zones.find((z) => z.position === 'bottom-right')!;
    const halfH = Math.floor(AVAIL_H / 2);
    expect(br.bounds).toEqual({ x: 960, y: halfH, width: 960, height: AVAIL_H - halfH });
  });

  it('maximize bounds cover full available area', () => {
    const max = zones.find((z) => z.position === 'maximize')!;
    expect(max.bounds).toEqual({ x: 0, y: 0, width: VP_W, height: AVAIL_H });
  });
});

describe('getSnapZoneAtPosition', () => {
  const zones = computeSnapZones(VP_W, VP_H, TASKBAR_H);

  it('returns null for center of screen', () => {
    expect(getSnapZoneAtPosition(VP_W / 2, AVAIL_H / 2, zones)).toBeNull();
  });

  it('detects left edge', () => {
    const zone = getSnapZoneAtPosition(5, AVAIL_H / 2, zones);
    expect(zone?.position).toBe('left');
  });

  it('detects right edge', () => {
    const zone = getSnapZoneAtPosition(VP_W - 5, AVAIL_H / 2, zones);
    expect(zone?.position).toBe('right');
  });

  it('detects top-left corner with priority over left edge', () => {
    const zone = getSnapZoneAtPosition(5, 5, zones);
    expect(zone?.position).toBe('top-left');
  });

  it('detects bottom-right corner', () => {
    const zone = getSnapZoneAtPosition(VP_W - 5, AVAIL_H - 5, zones);
    expect(zone?.position).toBe('bottom-right');
  });

  it('detects maximize at top center', () => {
    const zone = getSnapZoneAtPosition(VP_W / 2, 3, zones);
    expect(zone?.position).toBe('maximize');
  });

  it('top edge detected outside maximize zone', () => {
    // Far left of top edge (outside maximize center strip)
    const zone = getSnapZoneAtPosition(EDGE_THRESHOLD * 2 + 10, 5, zones);
    expect(zone?.position).toBe('top');
  });

  it('returns null just outside threshold', () => {
    const zone = getSnapZoneAtPosition(EDGE_THRESHOLD + 5, AVAIL_H / 2, zones);
    expect(zone).toBeNull();
  });
});

describe('computeSnapZones edge cases', () => {
  it('returns empty array for very small viewport', () => {
    // Available height < CORNER_SIZE * 2 (80px)
    const zones = computeSnapZones(100, 100, 48); // availH = 52
    expect(zones).toHaveLength(0);
  });

  it('returns empty array for very narrow viewport', () => {
    const zones = computeSnapZones(60, 500, 48); // width < CORNER_SIZE * 2
    expect(zones).toHaveLength(0);
  });

  it('handles exact minimum viewport gracefully', () => {
    // Exactly at CORNER_SIZE * 2 = 80 for both dimensions
    const zones = computeSnapZones(80, 128, 48); // availH = 80
    expect(zones).toHaveLength(9);
  });

  it('returns empty array for NaN inputs', () => {
    expect(computeSnapZones(NaN, 1080, 48)).toHaveLength(0);
    expect(computeSnapZones(1920, NaN, 48)).toHaveLength(0);
    expect(computeSnapZones(1920, 1080, NaN)).toHaveLength(0);
  });

  it('returns empty array for negative inputs', () => {
    expect(computeSnapZones(-100, 1080, 48)).toHaveLength(0);
    expect(computeSnapZones(1920, -100, 48)).toHaveLength(0);
    expect(computeSnapZones(1920, 1080, -48)).toHaveLength(0);
  });

  it('returns empty array for Infinity inputs', () => {
    expect(computeSnapZones(Infinity, 1080, 48)).toHaveLength(0);
  });

  it('returns null when zones array is empty', () => {
    expect(getSnapZoneAtPosition(100, 100, [])).toBeNull();
  });
});
