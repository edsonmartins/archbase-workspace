import { useEffect, useRef } from 'react';
import { useShortcutsStore, useWindowsStore } from '@archbase/workspace-state';
import type { Shortcut } from '@archbase/workspace-types';
import { matchesKeyCombo, parseKeyCombo, IS_MAC } from '../utils/parseKeyCombo';
import { LAYOUT } from '../constants';

/** Build a KeyCombo using Cmd on Mac, Ctrl on others */
function platformCombo(macCombo: string, otherCombo?: string): ReturnType<typeof parseKeyCombo> {
  return parseKeyCombo(IS_MAC ? macCombo : (otherCombo ?? macCombo.replace('Cmd', 'Ctrl')));
}

const BUILT_IN_SHORTCUTS: Shortcut[] = [
  {
    id: 'workspace.openLauncher',
    combo: platformCombo('Cmd+K'),
    label: 'Open App Launcher',
    scope: 'global',
    enabled: true,
  },
  {
    id: 'workspace.closeWindow',
    combo: platformCombo('Cmd+W'),
    label: 'Close Window',
    scope: 'global',
    enabled: true,
  },
  {
    id: 'workspace.minimizeAll',
    combo: platformCombo('Cmd+M'),
    label: 'Minimize All',
    scope: 'global',
    enabled: true,
  },
  {
    id: 'workspace.focusNext',
    combo: platformCombo('Cmd+`'),
    label: 'Focus Next Window',
    scope: 'global',
    enabled: true,
  },
  {
    id: 'workspace.focusPrevious',
    combo: platformCombo('Cmd+Shift+`'),
    label: 'Focus Previous Window',
    scope: 'global',
    enabled: true,
  },
  {
    id: 'workspace.tileHorizontal',
    combo: platformCombo('Cmd+Shift+H'),
    label: 'Tile Horizontal',
    scope: 'global',
    enabled: true,
  },
  {
    id: 'workspace.tileVertical',
    combo: platformCombo('Cmd+Shift+V'),
    label: 'Tile Vertical',
    scope: 'global',
    enabled: true,
  },
  {
    id: 'workspace.cascade',
    combo: platformCombo('Cmd+Shift+C'),
    label: 'Cascade Windows',
    scope: 'global',
    enabled: true,
  },
  {
    id: 'workspace.openCommandPalette',
    combo: platformCombo('Cmd+Shift+P'),
    label: 'Open Command Palette',
    scope: 'global',
    enabled: true,
  },
];

interface UseGlobalKeyboardListenerOptions {
  onToggleLauncher: () => void;
  onToggleCommandPalette: () => void;
}

/**
 * Registers built-in keyboard shortcuts and listens for keydown events globally.
 * Should be called once in the Desktop component.
 */
export function useGlobalKeyboardListener({ onToggleLauncher, onToggleCommandPalette }: UseGlobalKeyboardListenerOptions) {
  const actionsRef = useRef<Map<string, () => void>>(new Map());

  // Keep action handlers up to date
  useEffect(() => {
    actionsRef.current.set('workspace.openLauncher', onToggleLauncher);
    actionsRef.current.set('workspace.openCommandPalette', onToggleCommandPalette);
    actionsRef.current.set('workspace.closeWindow', () => {
      const focused = useWindowsStore.getState().getFocusedWindow();
      if (focused) useWindowsStore.getState().closeWindow(focused.id);
    });
    actionsRef.current.set('workspace.minimizeAll', () => {
      useWindowsStore.getState().minimizeAll();
    });
    actionsRef.current.set('workspace.focusNext', () => {
      useWindowsStore.getState().focusNext();
    });
    actionsRef.current.set('workspace.focusPrevious', () => {
      useWindowsStore.getState().focusPrevious();
    });
    actionsRef.current.set('workspace.tileHorizontal', () => {
      const vw = globalThis.innerWidth;
      const vh = globalThis.innerHeight;
      useWindowsStore.getState().tileWindows('horizontal', vw, vh, LAYOUT.TASKBAR_HEIGHT);
    });
    actionsRef.current.set('workspace.tileVertical', () => {
      const vw = globalThis.innerWidth;
      const vh = globalThis.innerHeight;
      useWindowsStore.getState().tileWindows('vertical', vw, vh, LAYOUT.TASKBAR_HEIGHT);
    });
    actionsRef.current.set('workspace.cascade', () => {
      const vw = globalThis.innerWidth;
      const vh = globalThis.innerHeight;
      useWindowsStore.getState().cascadeWindows(vw, vh, LAYOUT.TASKBAR_HEIGHT);
    });
  }, [onToggleLauncher, onToggleCommandPalette]);

  // Register built-in shortcuts once
  useEffect(() => {
    const store = useShortcutsStore.getState();
    for (const shortcut of BUILT_IN_SHORTCUTS) {
      store.register(shortcut);
    }

    return () => {
      const store = useShortcutsStore.getState();
      for (const shortcut of BUILT_IN_SHORTCUTS) {
        store.unregister(shortcut.id);
      }
    };
  }, []);

  // Global keydown listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const shortcuts = useShortcutsStore.getState().getAllShortcuts();
      for (const shortcut of shortcuts) {
        if (!shortcut.enabled) continue;
        if (shortcut.scope && shortcut.scope !== 'global') continue;
        if (matchesKeyCombo(e, shortcut.combo)) {
          e.preventDefault();
          e.stopPropagation();
          const action = actionsRef.current.get(shortcut.id);
          if (action) action();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
