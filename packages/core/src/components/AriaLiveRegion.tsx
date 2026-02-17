import { useEffect, useState } from 'react';
import { useWindowsStore } from '@archbase/workspace-state';

/**
 * Invisible live region that announces window state changes to screen readers.
 */
export function AriaLiveRegion() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const unsubscribe = useWindowsStore.subscribe(
      (state) => state.windows,
      (windows, prevWindows) => {
        // Detect new windows
        for (const [id, win] of windows) {
          if (!prevWindows.has(id)) {
            setAnnouncement(`Window ${win.title} opened`);
            return;
          }
        }
        // Detect removed windows
        for (const [id, win] of prevWindows) {
          if (!windows.has(id)) {
            setAnnouncement(`Window ${win.title} closed`);
            return;
          }
        }
        // Detect state changes
        for (const [id, win] of windows) {
          const prev = prevWindows.get(id);
          if (prev && prev.state !== win.state) {
            setAnnouncement(`Window ${win.title} ${win.state}`);
            return;
          }
        }
      },
    );
    return unsubscribe;
  }, []);

  // Clear announcement after screen reader has time to read it
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(''), 3000);
    return () => clearTimeout(timer);
  }, [announcement]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {announcement}
    </div>
  );
}
