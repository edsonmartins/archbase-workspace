import { useState } from 'react';
import { useWorkspace, useCommand, useTheme } from '@archbase/workspace-sdk';

interface AppProps {
  windowId?: string;
}

export default function App({ windowId }: AppProps) {
  const [count, setCount] = useState(0);
  const sdk = useWorkspace();
  const { isDark } = useTheme();

  // Register the greet command — auto-unregisters on unmount
  useCommand('hello-world.greet', () => {
    sdk.notifications.info('Hello!', 'Greetings from the Hello World app');
  });

  const colors = isDark
    ? { bg: '#0f172a', text: '#e2e8f0', muted: '#94a3b8', dimmed: '#64748b', border: '#334155', btnBg: '#1e293b' }
    : { bg: '#ffffff', text: '#1f2937', muted: '#6b7280', dimmed: '#9ca3af', border: '#d1d5db', btnBg: '#fff' };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 16,
        padding: 24,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: colors.bg,
        color: colors.text,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20, color: colors.text }}>
        Hello from Federated App!
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: colors.muted }}>
        This app is loaded via Module Federation 2.0
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 8,
        }}
      >
        <button
          onClick={() => setCount((c) => c - 1)}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: `1px solid ${colors.border}`,
            background: colors.btnBg,
            color: colors.text,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          -
        </button>
        <span style={{ fontSize: 24, fontWeight: 600, minWidth: 48, textAlign: 'center', color: colors.text }}>
          {count}
        </span>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: `1px solid ${colors.border}`,
            background: colors.btnBg,
            color: colors.text,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          +
        </button>
      </div>
      <button
        onClick={() => sdk.windows.setTitle(`Hello World (count: ${count})`)}
        style={{
          marginTop: 8,
          padding: '6px 14px',
          borderRadius: 6,
          border: `1px solid ${colors.border}`,
          background: colors.btnBg,
          cursor: 'pointer',
          fontSize: 12,
          color: colors.muted,
        }}
      >
        Update Window Title
      </button>
      {windowId && (
        <p style={{ margin: 0, fontSize: 11, color: colors.dimmed, marginTop: 12 }}>
          Window ID: {windowId}
        </p>
      )}
    </div>
  );
}
