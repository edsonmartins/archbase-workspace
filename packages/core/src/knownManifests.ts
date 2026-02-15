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
  },
];
