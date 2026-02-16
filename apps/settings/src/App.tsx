import { useCallback } from 'react';
import { useAllSettings, useSettingsStore } from '@archbase/workspace-state';
import { useWorkspace } from '@archbase/workspace-sdk';
import type { SettingsEntry, SettingValue } from '@archbase/workspace-types';

function SettingField({ entry }: { entry: SettingsEntry }) {
  const setValue = useSettingsStore((s) => s.setValue);
  const resetToDefault = useSettingsStore((s) => s.resetToDefault);

  const handleChange = useCallback(
    (newValue: SettingValue) => {
      setValue(entry.key, newValue);
    },
    [entry.key, setValue],
  );

  const isDefault = entry.value === entry.schema.default;

  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{entry.key}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{entry.schema.description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {entry.schema.type === 'boolean' ? (
          <button
            onClick={() => handleChange(!entry.value)}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              background: entry.value ? '#3b82f6' : '#fff',
              color: entry.value ? '#fff' : '#374151',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {entry.value ? 'ON' : 'OFF'}
          </button>
        ) : entry.schema.type === 'number' ? (
          <input
            type="number"
            value={entry.value as number}
            onChange={(e) => handleChange(Number(e.target.value))}
            style={{
              width: 80,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: 12,
              textAlign: 'right',
            }}
          />
        ) : (
          <input
            type="text"
            value={entry.value as string}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              width: 160,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: 12,
            }}
          />
        )}
        {!isDefault && (
          <button
            onClick={() => resetToDefault(entry.key)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: 11,
              padding: '2px 4px',
            }}
            title="Reset to default"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const sdk = useWorkspace();
  const allSettings = useAllSettings();

  // Group settings by source app
  const grouped = new Map<string, SettingsEntry[]>();
  for (const entry of allSettings) {
    const group = grouped.get(entry.source) || [];
    group.push(entry);
    grouped.set(entry.source, group);
  }

  const handleResetAll = useCallback(() => {
    useSettingsStore.getState().resetAll();
    sdk.notifications.info('Settings', 'All settings reset to defaults');
  }, [sdk]);

  return (
    <div style={{ height: '100%', overflow: 'auto', fontFamily: 'sans-serif', background: '#fff' }}>
      <div style={{ padding: 20, maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#1f2937' }}>Settings</h2>
          {allSettings.length > 0 && (
            <button
              onClick={handleResetAll}
              style={{
                border: '1px solid #d1d5db',
                background: '#fff',
                borderRadius: 4,
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              Reset All
            </button>
          )}
        </div>

        {allSettings.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 14 }}>
            No settings registered yet
          </div>
        ) : (
          Array.from(grouped.entries()).map(([source, entries]) => (
            <div key={source} style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#6b7280', textTransform: 'capitalize' }}>
                {source}
              </h3>
              {entries.map((entry) => (
                <SettingField key={entry.key} entry={entry} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
