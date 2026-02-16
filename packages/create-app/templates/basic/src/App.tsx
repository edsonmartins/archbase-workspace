import { useWorkspace } from '@archbase/workspace-sdk';

interface AppProps {
  windowId?: string;
}

export default function App({ windowId }: AppProps) {
  const sdk = useWorkspace();

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
        {{DISPLAY_NAME}}
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
        Your new workspace app is ready!
      </p>
      <button
        onClick={() => sdk.notifications.info('{{DISPLAY_NAME}}', 'Hello from {{DISPLAY_NAME}}!')}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          background: '#fff',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Say Hello
      </button>
      {windowId && (
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
          Window ID: {windowId}
        </p>
      )}
    </div>
  );
}
