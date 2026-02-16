# Getting Started with Archbase Workspace

This guide walks you through creating your first remote app for Archbase Workspace — from scaffolding to running inside the desktop shell.

---

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.x
- The Archbase Workspace monorepo cloned and dependencies installed:

```bash
git clone <repo-url> archbase-workspace
cd archbase-workspace
pnpm install
```

---

## 1. Create a New App

Create a new directory under `apps/`:

```bash
mkdir -p apps/my-app/src
```

### 1.1 — package.json

Create `apps/my-app/package.json`:

```json
{
  "name": "@archbase/my-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "rspack serve",
    "build": "rspack build",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@archbase/workspace-sdk": "workspace:*"
  },
  "devDependencies": {
    "@rspack/core": "^1.2.0",
    "@rspack/cli": "^1.2.0",
    "@module-federation/enhanced": "^0.8.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 1.2 — tsconfig.json

Create `apps/my-app/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true
  },
  "include": ["src"]
}
```

### 1.3 — Rspack + Module Federation Config

Create `apps/my-app/rspack.config.ts`:

```typescript
import { defineConfig } from '@rspack/cli';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import path from 'path';

export default defineConfig({
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    uniqueName: 'my_app',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic' } },
            },
          },
        },
        exclude: /node_modules/,
      },
      { test: /\.css$/, type: 'css' },
    ],
  },
  experiments: { css: true },
  plugins: [
    new ModuleFederationPlugin({
      name: 'my_app',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        zustand: { singleton: true, requiredVersion: '^5.0.0' },
        '@archbase/workspace-sdk': { singleton: true },
        '@archbase/workspace-state': { singleton: true },
      },
    }),
  ],
  devServer: {
    port: 3010,  // Choose an unused port
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
});
```

Key points:
- `name` must be a valid JS identifier (use underscores, not hyphens)
- `exposes` maps `./App` to your root component
- `shared` ensures React and Zustand are singletons across host and remotes
- CORS headers are required for cross-origin module loading

### 1.4 — Entry Point

Create `apps/my-app/src/index.ts`:

```typescript
// Entry point for standalone development
```

This file is the Rspack entry. In Module Federation, the actual component is loaded via `exposes`, not this entry.

---

## 2. Write Your App Component

Create `apps/my-app/src/App.tsx`:

```typescript
import { useWorkspace, useWindowContext } from '@archbase/workspace-sdk';

export default function MyApp() {
  const sdk = useWorkspace();
  const { windowId, close, setTitle } = useWindowContext();

  const handleGreet = () => {
    sdk.notifications.success('My App', 'Hello from My App!');
  };

  return (
    <div style={{ padding: 20, color: '#e2e8f0' }}>
      <h2>My App</h2>
      <p>Window ID: {windowId}</p>
      <button onClick={handleGreet}>Say Hello</button>
      <button onClick={close} style={{ marginLeft: 8 }}>Close</button>
    </div>
  );
}
```

The `useWorkspace()` hook gives you full access to the SDK:
- `sdk.windows` — open, close, minimize, maximize windows
- `sdk.notifications` — show toast notifications
- `sdk.commands` — register and execute commands
- `sdk.settings` — read/write workspace settings
- `sdk.storage` — scoped key-value storage per app
- `sdk.contextMenu` — show context menus
- `sdk.permissions` — check and request permissions

The `useWindowContext()` hook gives you window-specific utilities for the current window.

---

## 3. Register Your App Manifest

The host shell needs to know about your app. Open `packages/core/src/knownManifests.ts` and add your manifest:

```typescript
const MF_MY_APP_URL = process.env.MF_MY_APP_URL || 'http://localhost:3010';

// Add to the KNOWN_MANIFESTS array:
{
  id: 'dev.archbase.my-app',
  name: 'my_app',                    // Must match MF plugin name
  version: '0.1.0',
  entrypoint: './src/App.tsx',
  remoteEntry: `${MF_MY_APP_URL}/mf-manifest.json`,
  displayName: 'My App',
  description: 'My first workspace app',
  icon: '🚀',
  window: {
    defaultWidth: 500,
    defaultHeight: 400,
    minWidth: 300,
    minHeight: 250,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
  },
  source: 'local',
  permissions: ['notifications'],     // Permissions your app needs
  contributes: {
    commands: [
      {
        id: 'my-app.greet',
        title: 'Greet',
        category: 'My App',
        icon: '👋',
      },
    ],
  },
}
```

Also add the remote to `packages/core/rspack.config.ts`:

```typescript
// Add to the MF remotes object:
my_app: `my_app@${MF_MY_APP_URL}/mf-manifest.json`,
```

And add the URL constant at the top of the file:

```typescript
const MF_MY_APP_URL = process.env.MF_MY_APP_URL || 'http://localhost:3010';
```

---

## 4. Using the SDK

### Commands

Register a command handler that responds to Command Palette or keyboard shortcuts:

```typescript
import { useCommand, useWorkspace } from '@archbase/workspace-sdk';

function MyApp() {
  const sdk = useWorkspace();

  useCommand('my-app.greet', () => {
    sdk.notifications.info('My App', 'Hello!');
  });

  return <div>...</div>;
}
```

### Settings

Declare settings in your manifest's `contributes.settings`:

```typescript
contributes: {
  settings: [
    {
      key: 'my-app.theme',
      type: 'string',
      default: 'dark',
      description: 'App theme',
    },
  ],
}
```

Read them reactively with `useSettingValue()`:

```typescript
import { useSettingValue } from '@archbase/workspace-sdk';

const [theme] = useSettingValue<string>('my-app.theme');
```

### Storage

Scoped key-value storage (namespaced per app):

```typescript
import { useStorage } from '@archbase/workspace-sdk';

const [notes, setNotes] = useStorage<string[]>('savedNotes', []);
```

### Context Menus

Show context menus on right-click:

```typescript
const sdk = useWorkspace();

const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  sdk.contextMenu.show({ x: e.clientX, y: e.clientY }, [
    { id: 'copy', label: 'Copy', action: () => { /* ... */ } },
    { id: 'paste', label: 'Paste', action: () => { /* ... */ } },
    { type: 'separator' },
    { id: 'delete', label: 'Delete', action: () => { /* ... */ } },
  ]);
};
```

---

## 5. Install & Run

```bash
# Install new dependencies
pnpm install

# Start all dev servers
pnpm dev
```

Open `http://localhost:3000` — your app should appear in:
- The **App Launcher** (`Cmd+K` / `Ctrl+K`)
- The **Command Palette** (`Cmd+Shift+P`) with your registered commands
- Right-click on the desktop to see available apps

---

## 6. Build for Production

```bash
pnpm build
```

Each app builds independently. The host loads remotes via their `mf-manifest.json` URL, so apps can be deployed to different servers or CDNs.

---

## Project Structure Reference

A typical remote app:

```
apps/my-app/
├── package.json          # Dependencies + scripts
├── rspack.config.ts      # Rspack + Module Federation config
├── tsconfig.json         # TypeScript config (extends base)
└── src/
    ├── index.ts          # Rspack entry point (can be empty)
    └── App.tsx           # Root component (exposed via MF)
```

---

## Next Steps

- Read the [SDK API Reference](./ARCHBASE-WORKSPACE-SDK-API.md) for full SDK documentation
- See `apps/calculator/` for a complete example with Jotai state management
- See `apps/notes/` for an example with storage and multiple commands
- See `apps/file-explorer/` for a more complex app with tree views
- See `apps/settings/` for form handling and workspace settings integration
- See `apps/terminal/` for an in-browser terminal emulator
- See `apps/ai-assistant/` for OpenAI integration with function calling
- Read the [ADRs](./ARCHBASE-ADR-001-Rspack.md) for architecture decisions
