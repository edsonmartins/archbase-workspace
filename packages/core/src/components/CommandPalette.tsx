import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useCommandRegistryStore } from '@archbase/workspace-state';
import type { RegisteredCommand } from '@archbase/workspace-types';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
}

export function CommandPalette({ visible, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useFocusTrap(overlayRef, visible);

  const commands = useCommandRegistryStore((s) => s.getAllCommands());

  const filtered = useMemo(() => {
    if (!query.trim()) return commands.filter((c) => c.enabled);
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.enabled &&
        (c.title.toLowerCase().includes(q) ||
          (c.category && c.category.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  // Reset on open/close
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input on next frame so the overlay is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [visible]);

  // Scroll selected into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const items = resultsRef.current.querySelectorAll('.command-palette-item');
    items[selectedIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedIndex]);

  const executeCommand = useCallback(
    (cmd: RegisteredCommand) => {
      onClose();
      useCommandRegistryStore.getState().execute(cmd.id).catch((err) => {
        console.error(`[CommandPalette] Failed to execute command "${cmd.id}":`, err);
      });
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) {
            executeCommand(filtered[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, executeCommand, onClose],
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('command-palette-overlay')) {
        onClose();
      }
    },
    [onClose],
  );

  if (!visible) return null;

  const activeDescendant =
    filtered.length > 0 ? `cmd-${filtered[selectedIndex]?.id}` : undefined;

  return (
    <div
      ref={overlayRef}
      className="command-palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onClick={handleOverlayClick}
    >
      <div className="command-palette-card" onKeyDown={handleKeyDown}>
        <input
          ref={inputRef}
          className="command-palette-input"
          type="text"
          placeholder="Type a command..."
          value={query}
          role="combobox"
          aria-expanded={filtered.length > 0}
          aria-controls="command-palette-listbox"
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
        />
        <div
          ref={resultsRef}
          id="command-palette-listbox"
          role="listbox"
          aria-label="Commands"
          className="command-palette-results"
        >
          {filtered.length === 0 ? (
            <div className="command-palette-no-results">No commands found</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                id={`cmd-${cmd.id}`}
                className="command-palette-item"
                role="option"
                aria-selected={i === selectedIndex}
                data-selected={i === selectedIndex}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {cmd.icon && <span className="command-palette-icon" aria-hidden="true">{cmd.icon}</span>}
                <span className="command-palette-label">
                  {cmd.category && (
                    <span className="command-palette-category">{cmd.category}: </span>
                  )}
                  {cmd.title}
                </span>
                {cmd.keybinding && (
                  <span className="command-palette-shortcut">{cmd.keybinding}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
