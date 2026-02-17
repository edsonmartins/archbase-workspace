import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowsStore, useAllWindows, useAllApps, useRegistryStatus, useContextMenuStore } from '@archbase/workspace-state';
import type { AppManifest, SnapZone, ContextMenuItem } from '@archbase/workspace-types';
import { useRegistryInit } from '../hooks/useRegistryInit';
import { useThemeApplier } from '../hooks/useThemeApplier';
import { useGlobalKeyboardListener } from '../hooks/useGlobalKeyboardListener';
import { LAYOUT } from '../constants';
import { Window, type WindowAnimationState } from './Window';
import { Taskbar } from './Taskbar';
import { AppLauncher } from './AppLauncher';
import { SnapPreview } from './SnapPreview';
import { ToastContainer } from './ToastContainer';
import { CommandPalette } from './CommandPalette';
import { PermissionPrompt } from './PermissionPrompt';
import { CursorOverlay } from './CursorOverlay';
import { PresencePanel } from './PresencePanel';
import { AriaLiveRegion } from './AriaLiveRegion';

export function Desktop() {
  useRegistryInit();
  useThemeApplier();

  const registryStatus = useRegistryStatus();
  const apps = useAllApps();
  const windows = useAllWindows();
  const openWindow = useWindowsStore((s) => s.openWindow);
  const initialized = useRef(false);

  const [launcherVisible, setLauncherVisible] = useState(false);
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const [presencePanelVisible, setPresencePanelVisible] = useState(false);
  const [snapZone, setSnapZone] = useState<SnapZone | null>(null);

  const openContextMenu = useContextMenuStore((s) => s.open);
  const closeContextMenu = useContextMenuStore((s) => s.close);

  // Track window animation states for minimize/close/restore transitions
  const [animatingWindows, setAnimatingWindows] = useState<Map<string, WindowAnimationState>>(new Map());
  const prevWindowsRef = useRef<Map<string, string>>(new Map()); // id → state

  useEffect(() => {
    const currentMap = new Map<string, string>();
    for (const w of windows) {
      currentMap.set(w.id, w.state);
    }

    const prev = prevWindowsRef.current;

    for (const w of windows) {
      const prevState = prev.get(w.id);
      // Window was just minimized
      if (prevState && prevState !== 'minimized' && w.state === 'minimized') {
        setAnimatingWindows((m) => new Map(m).set(w.id, 'minimizing'));
        setTimeout(() => {
          setAnimatingWindows((m) => {
            const next = new Map(m);
            next.delete(w.id);
            return next;
          });
        }, 150);
      }
      // Window was just restored from minimized
      if (prevState === 'minimized' && w.state !== 'minimized') {
        setAnimatingWindows((m) => new Map(m).set(w.id, 'restoring'));
        setTimeout(() => {
          setAnimatingWindows((m) => {
            const next = new Map(m);
            next.delete(w.id);
            return next;
          });
        }, 150);
      }
    }

    prevWindowsRef.current = currentMap;
  }, [windows]);

  // Toggle launcher callback for keyboard shortcut
  const toggleLauncher = useCallback(() => {
    setLauncherVisible((v) => !v);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteVisible((v) => !v);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteVisible(false);
  }, []);

  useGlobalKeyboardListener({
    onToggleLauncher: toggleLauncher,
    onToggleCommandPalette: toggleCommandPalette,
  });

  // Open a default window once registry is ready
  useEffect(() => {
    if (initialized.current || registryStatus !== 'ready' || apps.length === 0) return;
    initialized.current = true;

    const defaultApp = apps[0];
    openWindow({
      appId: defaultApp.id,
      title: defaultApp.displayName || defaultApp.name,
      width: defaultApp.window?.defaultWidth ?? 500,
      height: defaultApp.window?.defaultHeight ?? 400,
      icon: defaultApp.icon,
    });
  }, [registryStatus, apps, openWindow]);

  const handleOpenApp = useCallback(
    (app: AppManifest) => {
      openWindow({
        appId: app.id,
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
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AriaLiveRegion />
      <div
        id="main-content"
        style={{
          width: '100%',
          height: `calc(100% - var(--taskbar-height))`,
          position: 'relative',
        }}
      >
        {windows
          .filter((w) => w.state !== 'minimized' || animatingWindows.has(w.id))
          .map((w) => (
            <Window
              key={w.id}
              windowId={w.id}
              onSnapPreview={handleSnapPreview}
              animationState={animatingWindows.get(w.id) ?? null}
            />
          ))}
        <SnapPreview zone={snapZone} />
        <CursorOverlay />
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
      <CommandPalette visible={commandPaletteVisible} onClose={closeCommandPalette} />
      <PermissionPrompt />
      <PresencePanel
        visible={presencePanelVisible}
        onClose={() => setPresencePanelVisible(false)}
      />
    </div>
  );
}

/** Clamp a menu position to stay within viewport bounds */
function clampMenuPosition(
  x: number,
  y: number,
  menuEl: HTMLElement,
): { x: number; y: number } {
  const rect = menuEl.getBoundingClientRect();
  const vw = globalThis.innerWidth;
  const vh = globalThis.innerHeight;
  return {
    x: x + rect.width > vw ? Math.max(0, vw - rect.width) : x,
    y: y + rect.height > vh ? Math.max(0, vh - rect.height) : y,
  };
}

interface MenuPanelProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  depth?: number;
  autoFocus?: boolean;
}

function MenuPanel({ items, position, onClose, depth = 0, autoFocus = true }: MenuPanelProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actionableIndices = items
    .map((item, i) => (!item.separator && !item.disabled ? i : -1))
    .filter((i) => i !== -1);

  // Clamp to viewport and auto-focus
  useEffect(() => {
    setFocusedIndex(autoFocus && actionableIndices.length > 0 ? actionableIndices[0] : -1);
    setOpenSubmenuId(null);

    requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;
      setAdjustedPos(clampMenuPosition(position.x, position.y, menu));
      if (autoFocus) menu.focus();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.x, position.y]);

  // Focus active item
  useEffect(() => {
    if (focusedIndex < 0) return;
    const menu = menuRef.current;
    if (!menu) return;
    const buttons = menu.querySelectorAll<HTMLButtonElement>(':scope > [role="menuitem"]:not(:disabled)');
    const targetIdx = actionableIndices.indexOf(focusedIndex);
    if (targetIdx >= 0 && buttons[targetIdx]) {
      buttons[targetIdx].focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex]);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const handleItemMouseEnter = useCallback((item: ContextMenuItem, index: number) => {
    clearHoverTimer();
    setFocusedIndex(index);
    if (item.children && item.children.length > 0) {
      hoverTimerRef.current = setTimeout(() => setOpenSubmenuId(item.id), 150);
    } else {
      setOpenSubmenuId(null);
    }
  }, [clearHoverTimer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (actionableIndices.length === 0) return;
      const currentPos = actionableIndices.indexOf(focusedIndex);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          e.stopPropagation();
          const next = currentPos < actionableIndices.length - 1 ? currentPos + 1 : 0;
          setFocusedIndex(actionableIndices[next]);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          e.stopPropagation();
          const prev = currentPos > 0 ? currentPos - 1 : actionableIndices.length - 1;
          setFocusedIndex(actionableIndices[prev]);
          break;
        }
        case 'ArrowRight': {
          const item = items[focusedIndex];
          if (item?.children && item.children.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            setOpenSubmenuId(item.id);
          }
          break;
        }
        case 'ArrowLeft': {
          if (depth > 0) {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
          break;
        }
        case 'Home':
          e.preventDefault();
          e.stopPropagation();
          setFocusedIndex(actionableIndices[0]);
          break;
        case 'End':
          e.preventDefault();
          e.stopPropagation();
          setFocusedIndex(actionableIndices[actionableIndices.length - 1]);
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          e.stopPropagation();
          const item = items[focusedIndex];
          if (item?.children && item.children.length > 0) {
            setOpenSubmenuId(item.id);
          } else if (item && !item.disabled && !item.separator) {
            item.action?.();
            onClose();
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          break;
      }
    },
    [actionableIndices, focusedIndex, items, onClose, depth],
  );

  // Compute submenu position relative to the parent item
  const getSubmenuPosition = useCallback((itemId: string) => {
    const menu = menuRef.current;
    if (!menu) return { x: adjustedPos.x + 200, y: adjustedPos.y };
    const menuRect = menu.getBoundingClientRect();
    const itemEl = menu.querySelector(`[data-submenu-id="${itemId}"]`) as HTMLElement | null;
    const itemRect = itemEl?.getBoundingClientRect();
    const y = itemRect ? itemRect.top : adjustedPos.y;
    // Try right side; if too close to edge, flip left
    const vw = globalThis.innerWidth;
    const x = menuRect.right + 200 > vw
      ? menuRect.left - 200
      : menuRect.right;
    return { x, y };
  }, [adjustedPos]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 10000 + depth,
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
            data-submenu-id={item.children ? item.id : undefined}
            onMouseEnter={() => handleItemMouseEnter(item, index)}
            onClick={() => {
              if (item.children && item.children.length > 0) {
                setOpenSubmenuId(item.id);
              } else {
                item.action?.();
                onClose();
              }
            }}
          >
            {item.icon && <span className="context-menu-icon" aria-hidden="true">{item.icon}</span>}
            <span className="context-menu-label">{item.label}</span>
            {item.children && item.children.length > 0 ? (
              <span className="context-menu-submenu-arrow" aria-hidden="true">{'\u203A'}</span>
            ) : (
              item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        ),
      )}
      {/* Render open submenu */}
      {openSubmenuId && (() => {
        const parentItem = items.find((i) => i.id === openSubmenuId);
        if (!parentItem?.children) return null;
        return (
          <MenuPanel
            items={parentItem.children}
            position={getSubmenuPosition(openSubmenuId)}
            onClose={() => {
              setOpenSubmenuId(null);
              // Return focus to parent menu
              menuRef.current?.focus();
            }}
            depth={depth + 1}
          />
        );
      })()}
    </div>
  );
}

function ContextMenuOverlay() {
  const visible = useContextMenuStore((s) => s.visible);
  const position = useContextMenuStore((s) => s.position);
  const items = useContextMenuStore((s) => s.items);
  const close = useContextMenuStore((s) => s.close);

  if (!visible) return null;

  return (
    <MenuPanel
      items={items}
      position={position}
      onClose={close}
    />
  );
}
