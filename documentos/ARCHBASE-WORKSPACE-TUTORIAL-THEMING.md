# Tutorial: Theming & Customization

> **Difficulty:** Beginner to Intermediate
> **Time:** ~30 minutes
> **Prerequisites:** Basic CSS knowledge, a working Archbase Workspace app
> **Last updated:** 2026-02-16

---

## Table of Contents

1. [Overview of the Theming System](#1-overview-of-the-theming-system)
2. [Available CSS Variables](#2-available-css-variables)
3. [Creating a Custom Theme](#3-creating-a-custom-theme)
4. [Applying Themes via Settings](#4-applying-themes-via-settings)
5. [Using useTheme() in Apps](#5-using-usetheme-in-apps)
6. [Dark / Light Mode Support](#6-dark--light-mode-support)

---

## 1. Overview of the Theming System

Archbase Workspace uses **CSS custom properties** (CSS variables) for its entire visual layer. This approach provides:

- **Zero JavaScript overhead** -- theme changes are instant CSS property updates.
- **Cascading by design** -- apps inherit workspace variables automatically.
- **Framework-agnostic** -- works with React, Angular, Vue, Svelte, or plain HTML/CSS.
- **Runtime switching** -- themes change without page reload.

### How it works

1. The **dark theme** is defined as the default in `:root` inside `global.css`.
2. The **light theme** is defined as overrides under `[data-theme="light"]` in `themes.css`.
3. The `useThemeApplier` hook (running in the host shell) reads the `workspace.theme` setting and sets the `data-theme` attribute on `<html>`.
4. When `workspace.theme` is `'auto'`, the system listens for OS preference changes via `matchMedia('(prefers-color-scheme: dark)')`.

```
Setting: 'dark'  --> <html>                     --> :root variables apply (dark)
Setting: 'light' --> <html data-theme="light">  --> [data-theme="light"] overrides
Setting: 'auto'  --> Depends on OS preference   --> resolves to dark or light
```

### Variable naming convention

Variables follow a component-based naming pattern:

```
--{component}-{property}[-{state}]
```

Examples:
- `--window-header-bg` -- Window header background
- `--window-header-bg-active` -- Window header background when active
- `--toast-info-accent` -- Toast notification info color
- `--context-menu-item-hover` -- Context menu item hover background

---

## 2. Available CSS Variables

All CSS variables are defined in `packages/core/src/styles/global.css` (dark defaults) and `packages/core/src/styles/themes.css` (light overrides).

### Window

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--window-border-color` | `#d1d5db` | `#e5e7eb` | Window border color |
| `--window-header-bg` | `#f3f4f6` | `#f9fafb` | Window header background |
| `--window-header-bg-active` | `#e5e7eb` | `#f3f4f6` | Active window header |
| `--window-body-bg` | `#ffffff` | `#ffffff` | Window content area background |
| `--window-title-color` | `#6b7280` | `#9ca3af` | Inactive window title text |
| `--window-title-color-active` | `#1f2937` | `#111827` | Active window title text |
| `--window-shadow` | `0 4px 12px rgba(0,0,0,0.15)` | `0 4px 12px rgba(0,0,0,0.08)` | Inactive window shadow |
| `--window-shadow-active` | `0 8px 24px rgba(0,0,0,0.2)` | `0 8px 24px rgba(0,0,0,0.12)` | Active window shadow |
| `--window-border-radius` | `8px` | -- | Window corner radius |
| `--window-header-height` | `36px` | -- | Header height (sync with constants.ts) |
| `--resize-handle-size` | `6px` | -- | Resize handle hitbox |

### Desktop & Layout

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--desktop-bg` | `#1e293b` | `#e2e8f0` | Desktop background color |
| `--taskbar-height` | `48px` | -- | Taskbar height (sync with constants.ts) |

### Taskbar

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--taskbar-bg` | `#0f172a` | `#ffffff` | Taskbar background |
| `--taskbar-border` | `#334155` | `#e5e7eb` | Taskbar top border |
| `--taskbar-item-bg` | `transparent` | -- | Taskbar item default bg |
| `--taskbar-item-bg-active` | `rgba(255,255,255,0.1)` | `rgba(0,0,0,0.06)` | Active item bg |
| `--taskbar-item-bg-hover` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.04)` | Hover item bg |
| `--taskbar-text` | `#e2e8f0` | `#334155` | Taskbar text color |
| `--taskbar-active-indicator` | `#3b82f6` | `#3b82f6` | Active app underline |

### Window Control Buttons

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--btn-close-bg` | `#dc2626` | `#dc2626` | Close button (red) |
| `--btn-minimize-bg` | `#d97706` | `#d97706` | Minimize button (amber) |
| `--btn-maximize-bg` | `#16a34a` | `#16a34a` | Maximize button (green) |
| `--btn-size` | `14px` | -- | Button diameter |
| `--ctrl-btn-hover-color` | `#fff` | `#fff` | Icon color on hover |

### Buttons & Text

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--text-primary` | `#f1f5f9` | `#111827` | Primary text color |
| `--text-secondary` | `#94a3b8` | `#6b7280` | Secondary/muted text |
| `--btn-primary-bg` | `#3b82f6` | `#3b82f6` | Primary button background |
| `--btn-primary-text` | `#fff` | `#fff` | Primary button text |
| `--btn-secondary-bg` | `#374151` | `#e5e7eb` | Secondary button background |
| `--btn-secondary-text` | `#d1d5db` | `#374151` | Secondary button text |
| `--focus-ring` | `#3b82f6` | -- | Focus outline color |

### App Launcher

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--launcher-overlay-bg` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.3)` | Overlay backdrop |
| `--launcher-card-bg` | `#1e293b` | `#ffffff` | Launcher card background |
| `--launcher-card-border` | `#334155` | `#e5e7eb` | Card border |
| `--launcher-input-bg` | `#0f172a` | `#f9fafb` | Search input background |
| `--launcher-input-border` | `#475569` | `#d1d5db` | Input border |
| `--launcher-input-color` | `#e2e8f0` | `#1f2937` | Input text color |
| `--launcher-result-bg-hover` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.04)` | Hover state |
| `--launcher-result-bg-selected` | `rgba(59,130,246,0.2)` | `rgba(59,130,246,0.12)` | Selected item |
| `--launcher-placeholder-color` | `#64748b` | `#9ca3af` | Placeholder text |

### Toast Notifications

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--toast-bg` | `#1e293b` | `#ffffff` | Toast background |
| `--toast-border` | `#334155` | `#e5e7eb` | Toast border |
| `--toast-shadow` | `0 4px 12px rgba(0,0,0,0.3)` | `0 4px 12px rgba(0,0,0,0.1)` | Shadow |
| `--toast-color` | `#e2e8f0` | `#1f2937` | Title text color |
| `--toast-message-color` | `#94a3b8` | `#6b7280` | Message text color |
| `--toast-info-accent` | `#3b82f6` | -- | Info badge color |
| `--toast-success-accent` | `#22c55e` | -- | Success badge color |
| `--toast-warning-accent` | `#f59e0b` | -- | Warning badge color |
| `--toast-error-accent` | `#ef4444` | -- | Error badge color |

### Context Menu

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--context-menu-bg` | `#1e293b` | `#ffffff` | Menu background |
| `--context-menu-border` | `#334155` | `#e5e7eb` | Border |
| `--context-menu-shadow` | `0 4px 16px rgba(0,0,0,0.4)` | `0 4px 16px rgba(0,0,0,0.12)` | Shadow |
| `--context-menu-color` | `#e2e8f0` | `#1f2937` | Text color |
| `--context-menu-item-hover` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.05)` | Hover state |
| `--context-menu-separator` | `#334155` | `#e5e7eb` | Divider line |
| `--context-menu-shortcut-color` | `#6b7280` | `#9ca3af` | Shortcut text |
| `--context-menu-disabled-color` | `#475569` | `#d1d5db` | Disabled items |

### Snap Preview

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--snap-preview-bg` | `rgba(59,130,246,0.15)` | `rgba(59,130,246,0.1)` | Preview fill |
| `--snap-preview-border` | `rgba(59,130,246,0.4)` | `rgba(59,130,246,0.3)` | Preview border |
| `--snap-preview-radius` | `8px` | -- | Corner radius |

### Collaboration

| Variable | Dark Default | Light Override | Description |
|----------|-------------|----------------|-------------|
| `--collab-badge-bg` | `#3b82f6` | `#3b82f6` | Collaboration badge |
| `--collab-badge-text` | `#ffffff` | `#ffffff` | Badge text |
| `--collab-panel-bg` | `var(--taskbar-bg)` | `#ffffff` | Panel background |
| `--collab-panel-border` | `var(--taskbar-border)` | `#e5e7eb` | Panel border |
| `--collab-panel-width` | `240px` | -- | Panel width |
| `--collab-dot-size` | `8px` | -- | Presence dot size |

---

## 3. Creating a Custom Theme

### Step 1: Create a theme CSS file

Create a new CSS file for your theme. Use the `[data-theme="your-theme-name"]` selector:

```css
/* packages/core/src/styles/my-ocean-theme.css */

[data-theme="ocean"] {
  /* Desktop */
  --desktop-bg: #0a1628;

  /* Window */
  --window-border-color: #1e3a5f;
  --window-header-bg: #0d2137;
  --window-header-bg-active: #0f2a47;
  --window-body-bg: #0a1628;
  --window-title-color: #4a8db7;
  --window-title-color-active: #7ec8e3;
  --window-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  --window-shadow-active: 0 8px 24px rgba(0, 0, 0, 0.4);

  /* Taskbar */
  --taskbar-bg: #061018;
  --taskbar-border: #1e3a5f;
  --taskbar-text: #7ec8e3;
  --taskbar-active-indicator: #00bcd4;
  --taskbar-item-bg-active: rgba(0, 188, 212, 0.15);
  --taskbar-item-bg-hover: rgba(0, 188, 212, 0.08);

  /* Buttons */
  --text-primary: #c5e4f3;
  --text-secondary: #4a8db7;
  --btn-primary-bg: #00bcd4;
  --btn-primary-text: #ffffff;
  --btn-secondary-bg: #0f2a47;
  --btn-secondary-text: #7ec8e3;
  --focus-ring: #00bcd4;

  /* Traffic light buttons -- keep universal */
  --btn-close-bg: #e74c3c;
  --btn-minimize-bg: #f39c12;
  --btn-maximize-bg: #2ecc71;

  /* Toast */
  --toast-bg: #0d2137;
  --toast-border: #1e3a5f;
  --toast-color: #c5e4f3;
  --toast-message-color: #4a8db7;

  /* Context Menu */
  --context-menu-bg: #0d2137;
  --context-menu-border: #1e3a5f;
  --context-menu-color: #c5e4f3;
  --context-menu-item-hover: rgba(0, 188, 212, 0.1);
  --context-menu-separator: #1e3a5f;

  /* Launcher */
  --launcher-overlay-bg: rgba(6, 16, 24, 0.7);
  --launcher-card-bg: #0d2137;
  --launcher-card-border: #1e3a5f;
  --launcher-input-bg: #061018;
  --launcher-input-color: #c5e4f3;
  --launcher-result-bg-selected: rgba(0, 188, 212, 0.2);
  --launcher-placeholder-color: #4a8db7;

  /* Collaboration */
  --collab-badge-bg: #00bcd4;
  --collab-panel-bg: #061018;
  --collab-panel-border: #1e3a5f;
}
```

### Step 2: Import the theme

Import the theme CSS in the host shell entry point:

```typescript
// packages/core/src/index.ts (or wherever CSS is imported)
import './styles/global.css';
import './styles/themes.css';
import './styles/my-ocean-theme.css';  // Add your theme
```

### Step 3: Register the theme setting option

Update the `workspace.theme` setting to include the new option. The Settings app will display it automatically:

```typescript
// In the settings manifest contribution
{
  key: 'workspace.theme',
  type: 'string',
  default: 'dark',
  description: 'Workspace color theme (dark, light, ocean, auto)',
}
```

### Step 4: Update the theme applier

The `useThemeApplier` hook needs to recognize the new theme. For built-in themes (dark, light), the existing logic handles `data-theme` attribute application. For custom themes, the same mechanism works -- just set `data-theme="ocean"` on `<html>`.

---

## 4. Applying Themes via Settings

### User changes theme via Settings app

1. Open Settings (`Cmd+,` or from the App Launcher).
2. Navigate to "Appearance".
3. Select a theme from the dropdown.
4. The theme applies immediately.

### Programmatic theme change

Use the SDK to change the theme from any app:

```tsx
import { useSettingValue } from '@archbase/workspace-sdk';

function ThemeSwitcher() {
  const [theme, setTheme] = useSettingValue<string>('workspace.theme');

  return (
    <div>
      <h3>Theme</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setTheme('dark')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: theme === 'dark' ? '2px solid var(--focus-ring)' : '1px solid var(--window-border-color)',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          Dark
        </button>
        <button
          onClick={() => setTheme('light')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: theme === 'light' ? '2px solid var(--focus-ring)' : '1px solid var(--window-border-color)',
            background: '#ffffff',
            color: '#1f2937',
            cursor: 'pointer',
          }}
        >
          Light
        </button>
        <button
          onClick={() => setTheme('auto')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: theme === 'auto' ? '2px solid var(--focus-ring)' : '1px solid var(--window-border-color)',
            background: 'var(--btn-secondary-bg)',
            color: 'var(--btn-secondary-text)',
            cursor: 'pointer',
          }}
        >
          Auto
        </button>
      </div>
    </div>
  );
}
```

### How the setting propagates

```
User sets 'workspace.theme' = 'light'
       |
       v
SettingsStore updates value
       |
       v
useThemeApplier (in host) reacts to change
       |
       v
Sets <html data-theme="light">
       |
       v
CSS [data-theme="light"] overrides activate
       |
       v
All components re-render with new CSS variable values
```

---

## 5. Using useTheme() in Apps

The `useTheme()` hook is essential when you need to style elements that **cannot use CSS custom properties**: Canvas, SVG fills, third-party library configurations, or inline styles computed in JavaScript.

### Basic usage

```tsx
import { useTheme } from '@archbase/workspace-sdk';

function MyChart() {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div>
      <p>Setting: {theme}</p>
      <p>Actual: {resolvedTheme}</p>
    </div>
  );
}
```

### Return values

| Property | Type | Description |
|----------|------|-------------|
| `theme` | `string` | Raw setting value: `'dark'`, `'light'`, or `'auto'` |
| `resolvedTheme` | `'dark' \| 'light'` | Effective theme after resolving `'auto'` via OS preference |

### Example: Canvas chart with theme colors

```tsx
import { useRef, useEffect } from 'react';
import { useTheme } from '@archbase/workspace-sdk';

const THEME_COLORS = {
  dark: {
    background: '#1e293b',
    gridLine: '#334155',
    text: '#e2e8f0',
    line: '#3b82f6',
    fill: 'rgba(59, 130, 246, 0.2)',
  },
  light: {
    background: '#ffffff',
    gridLine: '#e5e7eb',
    text: '#1f2937',
    line: '#2563eb',
    fill: 'rgba(37, 99, 235, 0.15)',
  },
};

function LineChart({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const colors = THEME_COLORS[resolvedTheme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Data line
    if (data.length === 0) return;
    const max = Math.max(...data);
    const stepX = width / (data.length - 1);

    ctx.beginPath();
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2;
    data.forEach((value, i) => {
      const x = i * stepX;
      const y = height - (value / max) * (height - 20);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area under the line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = colors.fill;
    ctx.fill();
  }, [data, colors]);

  return <canvas ref={canvasRef} width={400} height={200} />;
}
```

### Example: Third-party library integration

```tsx
import { useTheme } from '@archbase/workspace-sdk';

function CodeEditor() {
  const { resolvedTheme } = useTheme();

  // Configure a code editor library based on theme
  const editorOptions = {
    theme: resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light',
    fontSize: 14,
    minimap: { enabled: true },
  };

  return (
    <MonacoEditor
      language="typescript"
      options={editorOptions}
      // ... other props
    />
  );
}
```

### Example: SVG with theme-aware colors

```tsx
import { useTheme } from '@archbase/workspace-sdk';

function StatusIcon({ status }: { status: 'ok' | 'warn' | 'error' }) {
  const { resolvedTheme } = useTheme();

  const colors = {
    ok: '#22c55e',
    warn: '#f59e0b',
    error: '#ef4444',
  };

  const bgColor = resolvedTheme === 'dark' ? '#1e293b' : '#ffffff';

  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill={bgColor} />
      <circle cx="12" cy="12" r="6" fill={colors[status]} />
    </svg>
  );
}
```

---

## 6. Dark / Light Mode Support

### The three theme modes

| Mode | Behavior |
|------|----------|
| `'dark'` | Forces dark theme regardless of OS preference |
| `'light'` | Forces light theme regardless of OS preference |
| `'auto'` | Follows the OS preference (`prefers-color-scheme`) |

### Auto mode implementation

When `workspace.theme` is set to `'auto'`, the host shell listens for OS preference changes:

```typescript
// Simplified logic inside useThemeApplier (host shell)
const mq = window.matchMedia('(prefers-color-scheme: dark)');

const apply = () => {
  if (themeSetting === 'auto') {
    const resolved = mq.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
  }
};

mq.addEventListener('change', apply);
```

This means switching your OS appearance (e.g., macOS System Settings > Appearance) instantly updates the workspace theme when in `'auto'` mode.

### Writing theme-aware CSS in your app

Use CSS custom properties directly -- they update automatically:

```css
/* apps/my-app/src/styles.css */
.my-app-container {
  background: var(--window-body-bg);
  color: var(--text-primary);
  border: 1px solid var(--window-border-color);
}

.my-app-header {
  background: var(--window-header-bg);
  color: var(--window-title-color-active);
  padding: 8px 12px;
}

.my-app-sidebar {
  background: var(--taskbar-bg);
  border-right: 1px solid var(--taskbar-border);
  color: var(--taskbar-text);
}

.my-app-button-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
}

.my-app-button-primary:hover {
  filter: brightness(1.1);
}

.my-app-button-primary:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* Muted text */
.my-app-hint {
  color: var(--text-secondary);
  font-size: 12px;
}
```

### Best practices

1. **Prefer CSS variables over JavaScript theme logic.** Use `var(--text-primary)` instead of checking `resolvedTheme` in most cases.

2. **Reserve `useTheme()` for non-CSS contexts.** Canvas rendering, SVG attributes, third-party libraries, and computed inline styles.

3. **Test both themes.** Toggle between dark and light while developing to catch contrast issues.

4. **Use semantic variables.** Use `--text-primary` instead of hardcoded `#e2e8f0`. This ensures your app works with any theme.

5. **Do not override `:root` variables.** If you need custom variables for your app, prefix them:

   ```css
   .my-app {
     --my-app-accent: #8b5cf6;
     --my-app-sidebar-width: 240px;
   }
   ```

6. **Respect system preferences.** When building color pickers or palette displays, use `resolvedTheme` from `useTheme()` to pick appropriate contrast.

### Quick reference: Common patterns

**Theme-aware container:**
```css
.container {
  background: var(--window-body-bg);
  color: var(--text-primary);
}
```

**Elevated card:**
```css
.card {
  background: var(--launcher-card-bg);
  border: 1px solid var(--launcher-card-border);
  border-radius: 8px;
  box-shadow: var(--window-shadow);
}
```

**Input field:**
```css
.input {
  background: var(--launcher-input-bg);
  border: 1px solid var(--launcher-input-border);
  color: var(--launcher-input-color);
  border-radius: 6px;
  padding: 8px 12px;
}

.input::placeholder {
  color: var(--launcher-placeholder-color);
}
```

**List item with hover:**
```css
.list-item {
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 4px;
}

.list-item:hover {
  background: var(--context-menu-item-hover);
}
```

**Divider:**
```css
.divider {
  height: 1px;
  background: var(--context-menu-separator);
  margin: 8px 0;
}
```

---

## Next Steps

- [Cookbook](./ARCHBASE-WORKSPACE-COOKBOOK.md) -- Quick recipes for common patterns.
- [Tutorial: Using the SDK](./ARCHBASE-WORKSPACE-TUTORIAL-SDK.md) -- Deep dive into all SDK hooks.
- [Tutorial: First Plugin](./ARCHBASE-WORKSPACE-TUTORIAL-FIRST-PLUGIN.md) -- Build and publish a complete plugin.
- [SDK API Reference](./ARCHBASE-WORKSPACE-SDK-API.md) -- Complete API documentation.
