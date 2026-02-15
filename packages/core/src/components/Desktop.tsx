import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowsStore, useAllWindows, useAllApps, useRegistryStatus, useContextMenuStore } from '@archbase/workspace-state';
import type { AppManifest, SnapZone, ContextMenuItem } from '@archbase/workspace-types';
import { useRegistryInit } from '../hooks/useRegistryInit';
import { useGlobalKeyboardListener } from '../hooks/useGlobalKeyboardListener';
import { LAYOUT } from '../constants';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { AppLauncher } from './AppLauncher';
import { SnapPreview } from './SnapPreview';
import { ToastContainer } from './ToastContainer';

export function Desktop() {
  useRegistryInit();

  const registryStatus = useRegistryStatus();
  const apps = useAllApps();
  const windows = useAllWindows();
  const openWindow = useWindowsStore((s) => s.openWindow);
  const initialized = useRef(false);

  const [launcherVisible, setLauncherVisible] = useState(false);
  const [snapZone, setSnapZone] = useState<SnapZone | null>(null);

  const openContextMenu = useContextMenuStore((s) => s.open);
  const closeContextMenu = useContextMenuStore((s) => s.close);

  // Toggle launcher callback for keyboard shortcut
  const toggleLauncher = useCallback(() => {
    setLauncherVisible((v) => !v);
  }, []);

  useGlobalKeyboardListener({ onToggleLauncher: toggleLauncher });

  // Open a default window once registry is ready
  useEffect(() => {
    if (initialized.current || registryStatus !== 'ready' || apps.length === 0) return;
    initialized.current = true;

    const defaultApp = apps[0];
    openWindow({
      appId: defaultApp.name,
      title: defaultApp.displayName || defaultApp.name,
      width: defaultApp.window?.defaultWidth ?? 500,
      height: defaultApp.window?.defaultHeight ?? 400,
      icon: defaultApp.icon,
    });
  }, [registryStatus, apps, openWindow]);

  const handleOpenApp = useCallback(
    (app: AppManifest) => {
      openWindow({
        appId: app.name,
        title: app.displayName || app.name,
        width: app.window?.defaultWidth,
        height: app.window?.defaultHeight,
        minWidth: app.window?.minWidth,
        minHeight: app.window?.minHeight,
        maxWidth: app.window?.maxWidth,
        maxHeight: app.window?.maxHeight,
        resizable: app.window?.resizable,
        maximizable: app.window?.maximizable,
        minimizable: app.window?.minimizable,
        closable: app.window?.closable,
        icon: app.icon,
      });
    },
    [openWindow],
  );

  const handleSnapPreview = useCallback((zone: SnapZone | null) => {
    setSnapZone(zone);
  }, []);

  const closeLauncher = useCallback(() => {
    setLauncherVisible(false);
  }, []);

  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const { tileWindows, cascadeWindows, minimizeAll } = useWindowsStore.getState();

      const items: ContextMenuItem[] = [
        {
          id: 'tile-horizontal',
          label: 'Tile Horizontal',
          shortcut: 'Cmd+Shift+H',
          action: () => tileWindows('horizontal', globalThis.innerWidth, globalThis.innerHeight, LAYOUT.TASKBAR_HEIGHT),
        },
        {
          id: 'tile-vertical',
          label: 'Tile Vertical',
          shortcut: 'Cmd+Shift+V',
          action: () => tileWindows('vertical', globalThis.innerWidth, globalThis.innerHeight, LAYOUT.TASKBAR_HEIGHT),
        },
        {
          id: 'cascade',
          label: 'Cascade Windows',
          shortcut: 'Cmd+Shift+C',
          action: () => cascadeWindows(globalThis.innerWidth, globalThis.innerHeight, LAYOUT.TASKBAR_HEIGHT),
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'minimize-all',
          label: 'Minimize All',
          shortcut: 'Cmd+M',
          action: () => minimizeAll(),
        },
      ];

      openContextMenu({ x: e.clientX, y: e.clientY }, items);
    },
    [openContextMenu],
  );

  // Close context menu on any click outside the menu
  useEffect(() => {
    const handleClick = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.context-menu')) return;
      closeContextMenu();
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [closeContextMenu]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--desktop-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onContextMenu={handleDesktopContextMenu}
    >
      <div
        style={{
          width: '100%',
          height: `calc(100% - var(--taskbar-height))`,
          position: 'relative',
        }}
      >
        {windows
          .filter((w) => w.state !== 'minimized')
          .map((w) => (
            <Window key={w.id} windowId={w.id} onSnapPreview={handleSnapPreview} />
          ))}
        <SnapPreview zone={snapZone} />
        <ContextMenuOverlay />
      </div>
      <Taskbar apps={apps} onOpenApp={handleOpenApp} onOpenLauncher={toggleLauncher} />
      <AppLauncher
        visible={launcherVisible}
        apps={apps}
        onClose={closeLauncher}
        onOpenApp={handleOpenApp}
      />
      <ToastContainer />
    </div>
  );
}

function ContextMenuOverlay() {
  const visible = useContextMenuStore((s) => s.visible);
  const position = useContextMenuStore((s) => s.position);
  const items = useContextMenuStore((s) => s.items);
  const close = useContextMenuStore((s) => s.close);

  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [adjustedPos, setAdjustedPos] = useState(position);

  // Actionable (non-separator, non-disabled) items for keyboard nav
  const actionableIndices = items
    .map((item, i) => (!item.separator && !item.disabled ? i : -1))
    .filter((i) => i !== -1);

  // Clamp position to viewport and focus first item on open
  useEffect(() => {
    if (!visible) return;

    setFocusedIndex(actionableIndices.length > 0 ? actionableIndices[0] : -1);

    // Defer to next frame so the menu is rendered and measurable
    requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;

      const rect = menu.getBoundingClientRect();
      const vw = globalThis.innerWidth;
      const vh = globalThis.innerHeight;

      const x = position.x + rect.width > vw ? Math.max(0, vw - rect.width) : position.x;
      const y = position.y + rect.height > vh ? Math.max(0, vh - rect.height) : position.y;
      setAdjustedPos({ x, y });

      // Focus the menu container for keyboard events
      menu.focus();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Focus the active menu item when focusedIndex changes
  useEffect(() => {
    if (!visible || focusedIndex < 0) return;
    const menu = menuRef.current;
    if (!menu) return;
    const buttons = menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)');
    const targetIdx = actionableIndices.indexOf(focusedIndex);
    if (targetIdx >= 0 && buttons[targetIdx]) {
      buttons[targetIdx].focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex, visible]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (actionableIndices.length === 0) return;

      const currentPos = actionableIndices.indexOf(focusedIndex);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = currentPos < actionableIndices.length - 1 ? currentPos + 1 : 0;
          setFocusedIndex(actionableIndices[next]);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = currentPos > 0 ? currentPos - 1 : actionableIndices.length - 1;
          setFocusedIndex(actionableIndices[prev]);
          break;
        }
        case 'Home':
          e.preventDefault();
          setFocusedIndex(actionableIndices[0]);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(actionableIndices[actionableIndices.length - 1]);
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const item = items[focusedIndex];
          if (item && !item.disabled && !item.separator) {
            item.action?.();
            close();
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'Tab':
          // Trap focus inside menu
          e.preventDefault();
          break;
      }
    },
    [actionableIndices, focusedIndex, items, close],
  );

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 10000,
      }}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) =>
        item.separator ? (
          <div key={item.id} className="context-menu-separator" role="separator" />
        ) : (
          <button
            key={item.id}
            className="context-menu-item"
            role="menuitem"
            disabled={item.disabled}
            tabIndex={index === focusedIndex ? 0 : -1}
            onClick={() => {
              item.action?.();
              close();
            }}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
}
