import type { AppManifest } from '@archbase/workspace-types';

/**
 * Known app manifests for local development.
 * These are registered at startup and provide the default set of apps
 * available in the workspace. In production, manifests would be
 * discovered from a registry service or configuration endpoint.
 */

declare const process: { env: Record<string, string | undefined> };

const MF_HELLO_WORLD_URL = process.env.MF_HELLO_WORLD_URL || 'http://localhost:3001';
const MF_CALCULATOR_URL = process.env.MF_CALCULATOR_URL || 'http://localhost:3002';
const MF_NOTES_URL = process.env.MF_NOTES_URL || 'http://localhost:3003';
const MF_FILE_EXPLORER_URL = process.env.MF_FILE_EXPLORER_URL || 'http://localhost:3004';
const MF_SETTINGS_URL = process.env.MF_SETTINGS_URL || 'http://localhost:3005';
const MF_TERMINAL_URL = process.env.MF_TERMINAL_URL || 'http://localhost:3006';
const MF_AI_ASSISTANT_URL = process.env.MF_AI_ASSISTANT_URL || 'http://localhost:3007';
const MF_MARKETPLACE_URL = process.env.MF_MARKETPLACE_URL || 'http://localhost:3008';
const MF_DRAW_WASM_URL = process.env.MF_DRAW_WASM_URL || 'http://localhost:3009';

export const KNOWN_MANIFESTS: AppManifest[] = [
  {
    id: 'dev.archbase.hello-world',
    name: 'hello_world',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: `${MF_HELLO_WORLD_URL}/mf-manifest.json`,
    displayName: 'Hello World',
    description: 'A simple federated hello world application',
    icon: '🌍',
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
    permissions: ['notifications'],
    activationEvents: ['onCommand:hello-world.greet'],
    contributes: {
      commands: [
        {
          id: 'hello-world.greet',
          title: 'Greet',
          category: 'Hello World',
          icon: '👋',
        },
      ],
    },
  },
  {
    id: 'dev.archbase.calculator',
    name: 'calculator',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: `${MF_CALCULATOR_URL}/mf-manifest.json`,
    displayName: 'Calculator',
    description: 'A calculator app using Jotai for state management',
    icon: '🧮',
    window: {
      defaultWidth: 320,
      defaultHeight: 480,
      minWidth: 280,
      minHeight: 400,
      maxWidth: 500,
      maxHeight: 700,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    },
    source: 'local',
    permissions: ['notifications'],
    contributes: {
      commands: [
        {
          id: 'calculator.clear',
          title: 'Clear',
          category: 'Calculator',
          icon: '🧹',
        },
      ],
      settings: [
        {
          key: 'calculator.decimalPrecision',
          type: 'number',
          default: 2,
          description: 'Number of decimal places to display',
        },
      ],
    },
  },
  {
    id: 'dev.archbase.notes',
    name: 'notes',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: `${MF_NOTES_URL}/mf-manifest.json`,
    displayName: 'Notes',
    description: 'A simple notes application',
    icon: '📝',
    window: {
      defaultWidth: 600,
      defaultHeight: 450,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    },
    source: 'local',
    permissions: ['notifications', 'storage'],
    activationEvents: ['onCommand:notes.new'],
    contributes: {
      commands: [
        {
          id: 'notes.new',
          title: 'New Note',
          category: 'Notes',
          icon: '📄',
        },
        {
          id: 'notes.delete',
          title: 'Delete Note',
          category: 'Notes',
          icon: '🗑️',
        },
      ],
    },
  },
  {
    id: 'dev.archbase.file-explorer',
    name: 'file_explorer',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: `${MF_FILE_EXPLORER_URL}/mf-manifest.json`,
    displayName: 'File Explorer',
    description: 'Virtual filesystem browser',
    icon: '📁',
    window: {
      defaultWidth: 700,
      defaultHeight: 500,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    },
    source: 'local',
    permissions: [],
    activationEvents: ['onDesktopReady'],
    contributes: {
      commands: [
        {
          id: 'file-explorer.newFile',
          title: 'New File',
          category: 'File Explorer',
          icon: '📄',
        },
        {
          id: 'file-explorer.newFolder',
          title: 'New Folder',
          category: 'File Explorer',
          icon: '📁',
        },
      ],
    },
  },
  {
    id: 'dev.archbase.settings',
    name: 'settings',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: `${MF_SETTINGS_URL}/mf-manifest.json`,
    displayName: 'Settings',
    description: 'Workspace settings manager',
    icon: '⚙️',
    window: {
      defaultWidth: 600,
      defaultHeight: 500,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    },
    source: 'local',
    permissions: [],
    activationEvents: ['onCommand:workspace.openSettings'],
    contributes: {
      commands: [
        {
          id: 'workspace.openSettings',
          title: 'Open Settings',
          category: 'Workspace',
          icon: '⚙️',
          keybinding: 'Cmd+,',
        },
      ],
      settings: [
        {
          key: 'workspace.theme',
          type: 'string',
          default: 'dark',
          description: 'Workspace color theme (dark, light, auto)',
        },
      ],
    },
  },
  {
    id: 'dev.archbase.terminal',
    name: 'terminal',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: `${MF_TERMINAL_URL}/mf-manifest.json`,
    displayName: 'Terminal',
    description: 'An in-browser terminal emulator',
    icon: '💻',
    window: {
      defaultWidth: 700,
      defaultHeight: 450,
      minWidth: 400,
      minHeight: 250,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    },
    source: 'local',
    permissions: [],
    activationEvents: ['onCommand:terminal.open'],
    contributes: {
      commands: [
        {
          id: 'terminal.open',
          title: 'Open Terminal',
          category: 'Terminal',
          icon: '💻',
        },
      ],
    },
  },
  {
    id: 'dev.archbase.ai-assistant',
    name: 'ai_assistant',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: `${MF_AI_ASSISTANT_URL}/mf-manifest.json`,
    displayName: 'AI Assistant',
    description: 'AI Desktop Assistant with OpenAI integration',
    icon: '🤖',
    window: {
      defaultWidth: 420,
      defaultHeight: 600,
      minWidth: 350,
      minHeight: 400,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    },
    source: 'local',
    permissions: ['notifications'],
    activationEvents: ['onCommand:ai-assistant.open'],
    contributes: {
      commands: [
        {
          id: 'ai-assistant.open',
          title: 'Open AI Assistant',
          category: 'AI',
          icon: '🤖',
          keybinding: 'Cmd+Shift+A',
        },
      ],
      settings: [
        {
          key: 'ai-assistant.apiKey',
          type: 'string',
          default: '',
          description: 'OpenAI API key for the AI assistant',
        },
        {
          key: 'ai-assistant.model',
          type: 'string',
          default: 'gpt-4o',
          description: 'OpenAI model to use',
        },
      ],
    },
  },
  {
    id: 'dev.archbase.marketplace',
    name: 'marketplace',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: `${MF_MARKETPLACE_URL}/mf-manifest.json`,
    displayName: 'Marketplace',
    description: 'Browse, install, and manage workspace plugins',
    icon: '🏪',
    window: {
      defaultWidth: 900,
      defaultHeight: 650,
      minWidth: 600,
      minHeight: 400,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    },
    source: 'local',
    permissions: ['storage', 'notifications'],
    keywords: ['marketplace', 'plugins', 'extensions'],
    activationEvents: ['onCommand:marketplace.open'],
    contributes: {
      commands: [
        {
          id: 'marketplace.open',
          title: 'Open Marketplace',
          category: 'Marketplace',
          icon: '🏪',
        },
      ],
    },
  },
  {
    id: 'dev.archbase.draw-wasm',
    name: 'draw_wasm',
    version: '0.1.0',
    entrypoint: '',
    remoteEntry: '',
    displayName: 'Draw (WASM)',
    description: 'WebAssembly-powered drawing canvas',
    icon: '🎨',
    runtime: 'wasm' as const,
    wasm: {
      wasmUrl: `${MF_DRAW_WASM_URL}/draw.wasm`,
      jsGlueUrl: `${MF_DRAW_WASM_URL}/draw-adapter.js`,
      moduleType: 'standalone' as const,
      renderMode: 'canvas-2d' as const,
      memory: { initialPages: 256, maxPages: 4096 },
      streamingCompilation: true,
    },
    window: {
      defaultWidth: 800,
      defaultHeight: 600,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    },
    source: 'local',
    permissions: ['notifications', 'storage'],
    contributes: {
      commands: [
        {
          id: 'draw-wasm.clear',
          title: 'Clear Canvas',
          category: 'Draw',
          icon: '🧹',
        },
        {
          id: 'draw-wasm.save',
          title: 'Save as PNG',
          category: 'Draw',
          icon: '💾',
        },
      ],
    },
  },
];
