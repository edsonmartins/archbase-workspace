import React, { useRef, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ShadowContainerProps {
  children: ReactNode;
  /** Optional CSS text to inject into the shadow root */
  styles?: string;
}

/**
 * Wraps children in a Shadow DOM for CSS isolation.
 * Host CSS variables on :root inherit through the shadow boundary (per spec),
 * but class-based styles from the host do NOT penetrate — which is the
 * desired isolation behavior for third-party apps.
 */
export function ShadowContainer({ children, styles }: ShadowContainerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) {
      // Already attached (React strict-mode double-mount)
      if (host?.shadowRoot) setShadowRoot(host.shadowRoot);
      return;
    }
    const shadow = host.attachShadow({ mode: 'open' });
    setShadowRoot(shadow);
  }, []);

  return (
    <div ref={hostRef} className="shadow-host" style={{ width: '100%', height: '100%' }}>
      {shadowRoot &&
        createPortal(
          <>
            {styles && <style>{styles}</style>}
            <div style={{ width: '100%', height: '100%' }}>{children}</div>
          </>,
          shadowRoot,
        )}
    </div>
  );
}
