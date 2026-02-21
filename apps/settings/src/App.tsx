import { useCallback } from 'react';
import { useAllSettings, useSettingsStore } from '@archbase/workspace-state';
import { useWorkspace, useTheme } from '@archbase/workspace-sdk';
import type { SettingsEntry, SettingValue } from '@archbase/workspace-types';

function SettingField({ entry, isDark }: { entry: SettingsEntry; isDark: boolean }) {
  const setValue = useSettingsStore((s) => s.setValue);
  const resetToDefault = useSettingsStore((s) => s.resetToDefault);

  const handleChange = useCallback(
    (newValue: SettingValue) => {
      setValue(entry.key, newValue);
    },
    [entry.key, setValue],
  );

  const isDefault = entry.value === entry.schema.default;

  const c = isDark
    ? {
        border: '#334155', keyText: '#e2e8f0', descText: '#94a3b8',
        inputBorder: '#475569', inputBg: '#1e293b', inputText: '#e2e8f0',
        btnOnBg: '#3b82f6', btnOffBg: '#1e293b', btnOffText: '#94a3b8',
        resetText: '#94a3b8',
      }
    : {
        border: '#f3f4f6', keyText: '#1f2937', descText: '#6b7280',
        inputBorder: '#d1d5db', inputBg: '#fff', inputText: '#1f2937',
        btnOnBg: '#3b82f6', btnOffBg: '#fff', btnOffText: '#374151',
        resetText: '#6b7280',
      };

  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: `1px solid ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: c.keyText }}>{entry.key}</div>
        <div style={{ fontSize: 11, color: c.descText, marginTop: 2 }}>{entry.schema.description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {entry.schema.type === 'boolean' ? (
          <button
            onClick={() => handleChange(!entry.value)}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: `1px solid ${c.inputBorder}`,
              background: entry.value ? c.btnOnBg : c.btnOffBg,
              color: entry.value ? '#fff' : c.btnOffText,
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
              border: `1px solid ${c.inputBorder}`,
              background: c.inputBg,
              color: c.inputText,
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
              border: `1px solid ${c.inputBorder}`,
              background: c.inputBg,
              color: c.inputText,
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
              color: c.resetText,
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
  const { isDark } = useTheme();
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

  const c = isDark
    ? { bg: '#0f172a', headingText: '#e2e8f0', sectionText: '#94a3b8', emptyText: '#64748b', btnBg: '#1e293b', btnBorder: '#475569', btnText: '#94a3b8' }
    : { bg: '#fff', headingText: '#1f2937', sectionText: '#6b7280', emptyText: '#9ca3af', btnBg: '#fff', btnBorder: '#d1d5db', btnText: '#6b7280' };

  return (
    <div style={{ height: '100%', overflow: 'auto', fontFamily: 'sans-serif', background: c.bg }}>
      <div style={{ padding: 20, maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: c.headingText }}>Settings</h2>
          {allSettings.length > 0 && (
            <button
              onClick={handleResetAll}
              style={{
                border: `1px solid ${c.btnBorder}`,
                background: c.btnBg,
                borderRadius: 4,
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: 12,
                color: c.btnText,
              }}
            >
              Reset All
            </button>
          )}
        </div>

        {allSettings.length === 0 ? (
          <div style={{ textAlign: 'center', color: c.emptyText, padding: 40, fontSize: 14 }}>
            No settings registered yet
          </div>
        ) : (
          Array.from(grouped.entries()).map(([source, entries]) => (
            <div key={source} style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: c.sectionText, textTransform: 'capitalize' }}>
                {source}
              </h3>
              {entries.map((entry) => (
                <SettingField key={entry.key} entry={entry} isDark={isDark} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
