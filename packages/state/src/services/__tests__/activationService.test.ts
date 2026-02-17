import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppManifest } from '@archbase/workspace-types';
import { activationService, setPreloadHandler, setAutoStartHandler } from '../activationService';
import { useAppRegistryStore } from '../../stores/registry';
import { useCommandRegistryStore } from '../../stores/commands';
import { useMenuRegistryStore } from '../../stores/menus';
import { useWidgetRegistryStore } from '../../stores/widgets';
import { useSettingsStore } from '../../stores/settings';
import { useShortcutsStore } from '../../stores/shortcuts';

function resetAllStores() {
  useAppRegistryStore.setState({
    apps: new Map(),
    status: 'idle',
    errors: [],
    lastDiscoveryAt: null,
  });
  useCommandRegistryStore.setState({ commands: new Map() });
  useMenuRegistryStore.setState({
    applicationMenus: new Map(),
    contextMenus: new Map(),
    windowMenus: new Map(),
  });
  useWidgetRegistryStore.setState({ widgets: new Map() });
  useSettingsStore.setState({ values: new Map() });
  useShortcutsStore.setState({ shortcuts: new Map() });
  activationService.dispose();
}

function registerManifestDirectly(manifest: AppManifest): void {
  // Register directly in store without going through registerManifest
  // (which would call processContributions, conflicting with activation service)
  useAppRegistryStore.setState((state) => {
    const apps = new Map(state.apps);
    apps.set(manifest.id, manifest);
    return { apps };
  });
}

function makeManifest(overrides: Partial<AppManifest> = {}): AppManifest {
  return {
    id: 'dev.archbase.test',
    name: 'test_app',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:9999/mf-manifest.json',
    ...overrides,
  };
}

describe('ActivationService', () => {
  beforeEach(resetAllStores);

  describe('init', () => {
    it('builds activation map from registered manifests', () => {
      registerManifestDirectly(
        makeManifest({
          id: 'app.one',
          activationEvents: ['onDesktopReady'],
          contributes: { commands: [{ id: 'one.cmd', title: 'One' }] },
        }),
      );

      activationService.init();

      // onDesktopReady should activate the app
      expect(activationService.isActivated('app.one')).toBe(true);
    });

    it('does not activate apps without onDesktopReady', () => {
      registerManifestDirectly(
        makeManifest({
          id: 'app.lazy',
          activationEvents: ['onCommand:lazy.open'],
        }),
      );

      activationService.init();

      expect(activationService.isActivated('app.lazy')).toBe(false);
    });

    it('activates multiple apps on onDesktopReady', () => {
      registerManifestDirectly(
        makeManifest({ id: 'app.one', activationEvents: ['onDesktopReady'] }),
      );
      registerManifestDirectly(
        makeManifest({ id: 'app.two', activationEvents: ['onDesktopReady'] }),
      );

      activationService.init();

      expect(activationService.isActivated('app.one')).toBe(true);
      expect(activationService.isActivated('app.two')).toBe(true);
    });

    it('is idempotent (calling init twice does not re-activate)', () => {
      registerManifestDirectly(
        makeManifest({
          id: 'app.one',
          activationEvents: ['onDesktopReady'],
        }),
      );

      activationService.init();
      activationService.init(); // should be no-op
      expect(activationService.isActivated('app.one')).toBe(true);
    });
  });

  describe('fireEvent', () => {
    it('activates app matching the fired event', () => {
      registerManifestDirectly(
        makeManifest({
          id: 'app.notes',
          activationEvents: ['onCommand:notes.new'],
        }),
      );

      activationService.init();
      expect(activationService.isActivated('app.notes')).toBe(false);

      activationService.fireEvent('onCommand:notes.new');
      expect(activationService.isActivated('app.notes')).toBe(true);
    });

    it('does not re-activate already activated app', () => {
      registerManifestDirectly(
        makeManifest({
          id: 'app.one',
          activationEvents: ['onDesktopReady', 'onCommand:one.action'],
        }),
      );

      activationService.init(); // activates via onDesktopReady
      expect(activationService.isActivated('app.one')).toBe(true);

      // Fire event again — should not change anything
      activationService.fireEvent('onCommand:one.action');
      expect(activationService.isActivated('app.one')).toBe(true);
    });

    it('does nothing for unregistered events', () => {
      activationService.init();
      activationService.fireEvent('onCommand:unknown.action');
      expect(useCommandRegistryStore.getState().commands.size).toBe(0);
    });
  });

  describe('isActivated', () => {
    it('returns false for non-activated app', () => {
      registerManifestDirectly(makeManifest({ id: 'app.lazy' }));
      activationService.init();
      expect(activationService.isActivated('app.lazy')).toBe(false);
    });

    it('returns true after activation', () => {
      registerManifestDirectly(
        makeManifest({ id: 'app.one', activationEvents: ['onDesktopReady'] }),
      );
      activationService.init();
      expect(activationService.isActivated('app.one')).toBe(true);
    });
  });

  describe('getPendingApps', () => {
    it('returns apps not yet activated', () => {
      registerManifestDirectly(
        makeManifest({ id: 'app.active', activationEvents: ['onDesktopReady'] }),
      );
      registerManifestDirectly(
        makeManifest({ id: 'app.lazy', activationEvents: ['onCommand:lazy.open'] }),
      );
      registerManifestDirectly(
        makeManifest({ id: 'app.noevents' }),
      );

      activationService.init();

      const pending = activationService.getPendingApps();
      expect(pending).toContain('app.lazy');
      expect(pending).toContain('app.noevents');
      expect(pending).not.toContain('app.active');
    });
  });

  describe('dispose', () => {
    it('resets all internal state', () => {
      registerManifestDirectly(
        makeManifest({ id: 'app.one', activationEvents: ['onDesktopReady'] }),
      );
      activationService.init();
      expect(activationService.isActivated('app.one')).toBe(true);

      activationService.dispose();
      expect(activationService.isActivated('app.one')).toBe(false);
      // getPendingApps reads from registry, which still has the app
      // After dispose, the app is no longer tracked as activated
      expect(activationService.getPendingApps()).toContain('app.one');
    });

    it('allows re-initialization after dispose', () => {
      registerManifestDirectly(
        makeManifest({ id: 'app.one', activationEvents: ['onDesktopReady'] }),
      );

      activationService.init();
      activationService.dispose();
      activationService.init();

      expect(activationService.isActivated('app.one')).toBe(true);
    });
  });

  describe('apps without activationEvents', () => {
    it('apps without activationEvents are never activated by the service', () => {
      registerManifestDirectly(
        makeManifest({ id: 'app.plain' }),
      );
      activationService.init();
      activationService.fireEvent('onDesktopReady');
      expect(activationService.isActivated('app.plain')).toBe(false);
    });
  });

  describe('lifecycle handlers', () => {
    it('setPreloadHandler is called when preload=true app is activated', () => {
      const handler = vi.fn();
      setPreloadHandler(handler);

      registerManifestDirectly(
        makeManifest({
          id: 'app.preload',
          activationEvents: ['onDesktopReady'],
          lifecycle: { preload: true },
        }),
      );

      activationService.init();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'app.preload', lifecycle: { preload: true } }),
      );
    });

    it('setAutoStartHandler is called after init for autoStart=true apps', () => {
      const handler = vi.fn();
      setAutoStartHandler(handler);

      registerManifestDirectly(
        makeManifest({
          id: 'app.autostart',
          activationEvents: ['onDesktopReady'],
          lifecycle: { autoStart: true },
        }),
      );

      activationService.init();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'app.autostart', lifecycle: { autoStart: true } }),
      );
    });

    it('apps without lifecycle config do not trigger handlers', () => {
      const preloadFn = vi.fn();
      const autoStartFn = vi.fn();
      setPreloadHandler(preloadFn);
      setAutoStartHandler(autoStartFn);

      registerManifestDirectly(
        makeManifest({
          id: 'app.nolc',
          activationEvents: ['onDesktopReady'],
        }),
      );

      activationService.init();

      expect(preloadFn).not.toHaveBeenCalled();
      expect(autoStartFn).not.toHaveBeenCalled();
    });

    it('handlers not called if not set (null)', () => {
      // Do NOT set handlers — they should be null after dispose()
      registerManifestDirectly(
        makeManifest({
          id: 'app.lc',
          activationEvents: ['onDesktopReady'],
          lifecycle: { preload: true, autoStart: true },
        }),
      );

      // Should not throw even though handlers are null
      expect(() => activationService.init()).not.toThrow();
      expect(activationService.isActivated('app.lc')).toBe(true);
    });

    it('activateApp is idempotent — handlers fire only once', () => {
      const preloadFn = vi.fn();
      setPreloadHandler(preloadFn);

      registerManifestDirectly(
        makeManifest({
          id: 'app.once',
          activationEvents: ['onDesktopReady', 'onCommand:once.open'],
          lifecycle: { preload: true },
        }),
      );

      activationService.init(); // activates via onDesktopReady — preloadFn fires
      activationService.fireEvent('onCommand:once.open'); // already activated — should not fire again

      expect(preloadFn).toHaveBeenCalledTimes(1);
    });

    it('dispose resets handlers for re-init', () => {
      const handler = vi.fn();
      setPreloadHandler(handler);

      registerManifestDirectly(
        makeManifest({
          id: 'app.reset',
          activationEvents: ['onDesktopReady'],
          lifecycle: { preload: true },
        }),
      );

      activationService.init();
      expect(handler).toHaveBeenCalledTimes(1);

      // dispose resets handlers to null
      activationService.dispose();

      // Re-init without re-setting handler — should not call the old handler
      activationService.init();
      expect(handler).toHaveBeenCalledTimes(1); // still 1, not 2
    });
  });
});
