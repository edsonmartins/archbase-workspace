import { useState } from 'react';

interface AppProps {
  windowId?: string;
}

export default function App({ windowId }: AppProps) {
  const [count, setCount] = useState(0);

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
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20, color: '#1f2937' }}>
        Hello from Federated App!
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
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
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          -
        </button>
        <span style={{ fontSize: 24, fontWeight: 600, minWidth: 48, textAlign: 'center' }}>
          {count}
        </span>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          +
        </button>
      </div>
      {windowId && (
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
          Window ID: {windowId}
        </p>
      )}
    </div>
  );
}
