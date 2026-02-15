import { describe, it, expect } from 'vitest';
import { appManifestSchema, validateManifest, validateManifestSafe } from '../manifest';

const MINIMAL_MANIFEST = {
  id: 'dev.archbase.test-app',
  name: 'test_app',
  version: '0.1.0',
  entrypoint: './src/App.tsx',
  remoteEntry: 'http://localhost:3001/mf-manifest.json',
};

const FULL_MANIFEST = {
  ...MINIMAL_MANIFEST,
  displayName: 'Test App',
  description: 'A test application',
  author: { name: 'Edson', email: 'edson@archbase.dev', url: 'https://archbase.dev' },
  license: 'MIT',
  homepage: 'https://archbase.dev/apps/test',
  repository: { type: 'git' as const, url: 'https://github.com/archbase/test-app' },
  keywords: ['test', 'demo'],
  icon: 'flask',
  screenshots: ['screenshot1.png', 'screenshot2.png'],
  window: {
    defaultWidth: 800,
    defaultHeight: 600,
    minWidth: 300,
    minHeight: 200,
    maxWidth: 1920,
    maxHeight: 1080,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
    alwaysOnTop: false,
  },
  shared: { react: '^19.0.0' },
  exposes: { './App': './src/App.tsx' },
  permissions: ['notifications' as const, 'storage' as const, 'clipboard.read' as const],
  contributes: {
    commands: [{ id: 'test.run', title: 'Run Test', icon: 'play', keybinding: 'Ctrl+T', category: 'Test' }],
    menus: {
      application: [{ command: 'test.run', group: 'test', when: 'isTestApp' }],
      context: [{ command: 'test.run' }],
      window: [{ command: 'test.run' }],
    },
    widgets: [{ id: 'test.status', title: 'Test Status', component: 'TestStatusWidget', defaultLocation: 'statusBar' as const }],
    settings: [{ key: 'test.verbose', type: 'boolean' as const, default: false, description: 'Enable verbose test output' }],
  },
  activationEvents: ['onDesktopReady', 'onCommand:test.run', 'onFileType:.test.ts'],
  lifecycle: { singleton: true, background: false, preload: false, autoStart: false },
  dependencies: { '@archbase/workspace-sdk': '^0.1.0' },
  platform: { os: ['windows' as const, 'macos' as const], browser: ['chrome' as const, 'edge' as const], minVersion: '100' },
  source: 'local' as const,
};

describe('Manifest Zod Schema', () => {
  describe('valid manifests', () => {
    it('accepts a minimal manifest (5 required fields)', () => {
      const result = appManifestSchema.safeParse(MINIMAL_MANIFEST);
      expect(result.success).toBe(true);
    });

    it('accepts a full manifest with all optional fields', () => {
      const result = appManifestSchema.safeParse(FULL_MANIFEST);
      expect(result.success).toBe(true);
    });

    it('preserves all fields when parsing', () => {
      const result = appManifestSchema.parse(MINIMAL_MANIFEST);
      expect(result.id).toBe('dev.archbase.test-app');
      expect(result.name).toBe('test_app');
      expect(result.version).toBe('0.1.0');
      expect(result.entrypoint).toBe('./src/App.tsx');
      expect(result.remoteEntry).toBe('http://localhost:3001/mf-manifest.json');
    });
  });

  describe('required field validation', () => {
    it('rejects manifest without id', () => {
      const { id: _, ...noId } = MINIMAL_MANIFEST;
      expect(appManifestSchema.safeParse(noId).success).toBe(false);
    });

    it('rejects manifest without name', () => {
      const { name: _, ...noName } = MINIMAL_MANIFEST;
      expect(appManifestSchema.safeParse(noName).success).toBe(false);
    });

    it('rejects manifest without version', () => {
      const { version: _, ...noVersion } = MINIMAL_MANIFEST;
      expect(appManifestSchema.safeParse(noVersion).success).toBe(false);
    });

    it('rejects manifest without entrypoint', () => {
      const { entrypoint: _, ...noEntry } = MINIMAL_MANIFEST;
      expect(appManifestSchema.safeParse(noEntry).success).toBe(false);
    });

    it('rejects manifest without remoteEntry', () => {
      const { remoteEntry: _, ...noRemote } = MINIMAL_MANIFEST;
      expect(appManifestSchema.safeParse(noRemote).success).toBe(false);
    });
  });

  describe('id validation', () => {
    it('rejects id with uppercase letters', () => {
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, id: 'com.Archbase.App' });
      expect(result.success).toBe(false);
    });

    it('rejects id with spaces', () => {
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, id: 'com.archbase test' });
      expect(result.success).toBe(false);
    });

    it('rejects empty id', () => {
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, id: '' });
      expect(result.success).toBe(false);
    });

    it('accepts id with dots and hyphens', () => {
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, id: 'dev.archbase.my-app.v2' });
      expect(result.success).toBe(true);
    });
  });

  describe('version validation', () => {
    it('rejects non-semver version', () => {
      expect(appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, version: '1.0' }).success).toBe(false);
      expect(appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, version: 'v1.0.0' }).success).toBe(false);
      expect(appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, version: '1' }).success).toBe(false);
    });

    it('accepts valid semver versions', () => {
      expect(appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, version: '0.0.1' }).success).toBe(true);
      expect(appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, version: '10.20.30' }).success).toBe(true);
    });
  });

  describe('permissions validation', () => {
    it('accepts all 9 valid permissions', () => {
      const allPermissions = [
        'notifications', 'storage', 'clipboard.read', 'clipboard.write',
        'filesystem.read', 'filesystem.write', 'network', 'camera', 'microphone',
      ];
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, permissions: allPermissions });
      expect(result.success).toBe(true);
    });

    it('rejects invalid permission', () => {
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, permissions: ['geolocation'] });
      expect(result.success).toBe(false);
    });
  });

  describe('activationEvents validation', () => {
    it('accepts valid activation events', () => {
      const events = ['onDesktopReady', 'onCommand:my.cmd', 'onFileType:.tsx', 'onShortcut:Ctrl+K', 'onSchedule:daily'];
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, activationEvents: events });
      expect(result.success).toBe(true);
    });

    it('rejects invalid activation event format', () => {
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, activationEvents: ['onStartup'] });
      expect(result.success).toBe(false);
    });
  });

  describe('windowConfig validation', () => {
    it('accepts valid window config', () => {
      const result = appManifestSchema.safeParse({
        ...MINIMAL_MANIFEST,
        window: { defaultWidth: 800, defaultHeight: 600, minWidth: 200, resizable: true },
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative dimensions', () => {
      const result = appManifestSchema.safeParse({
        ...MINIMAL_MANIFEST,
        window: { defaultWidth: -100 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero dimensions', () => {
      const result = appManifestSchema.safeParse({
        ...MINIMAL_MANIFEST,
        window: { minHeight: 0 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('author validation', () => {
    it('accepts author with name only', () => {
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, author: { name: 'Edson' } });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const result = appManifestSchema.safeParse({ ...MINIMAL_MANIFEST, author: { name: 'Edson', email: 'not-an-email' } });
      expect(result.success).toBe(false);
    });

    it('accepts valid author with email and url', () => {
      const result = appManifestSchema.safeParse({
        ...MINIMAL_MANIFEST,
        author: { name: 'Edson', email: 'edson@archbase.dev', url: 'https://archbase.dev' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('widget defaultLocation validation', () => {
    it('accepts valid widget locations', () => {
      for (const loc of ['statusBar', 'sidebar', 'panel'] as const) {
        const result = appManifestSchema.safeParse({
          ...MINIMAL_MANIFEST,
          contributes: { widgets: [{ id: 'w1', title: 'Widget', component: 'W', defaultLocation: loc }] },
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid widget location', () => {
      const result = appManifestSchema.safeParse({
        ...MINIMAL_MANIFEST,
        contributes: { widgets: [{ id: 'w1', title: 'Widget', component: 'W', defaultLocation: 'header' }] },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateManifest (throwing)', () => {
    it('returns parsed data for valid manifest', () => {
      const result = validateManifest(MINIMAL_MANIFEST);
      expect(result.id).toBe('dev.archbase.test-app');
    });

    it('throws for invalid manifest', () => {
      expect(() => validateManifest({})).toThrow();
    });
  });

  describe('validateManifestSafe (non-throwing)', () => {
    it('returns success: true for valid manifest', () => {
      const result = validateManifestSafe(MINIMAL_MANIFEST);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('dev.archbase.test-app');
      }
    });

    it('returns success: false with error for invalid manifest', () => {
      const result = validateManifestSafe({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
