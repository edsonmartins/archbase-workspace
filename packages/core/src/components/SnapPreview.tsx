import type { SnapZone } from '@archbase/workspace-types';

interface SnapPreviewProps {
  zone: SnapZone | null;
}

export function SnapPreview({ zone }: SnapPreviewProps) {
  if (!zone) return null;

  return (
    <div
      className="snap-preview"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: zone.bounds.x,
        top: zone.bounds.y,
        width: zone.bounds.width,
        height: zone.bounds.height,
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    />
  );
}
