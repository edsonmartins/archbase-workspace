import { useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { AppManifest } from '@archbase/workspace-types';
import { useAppRegistryStore } from '@archbase/workspace-state';
import { SandboxedApp } from '../SandboxedApp';

/**
 * SandboxedApp renders an iframe for sandboxed apps with a postMessage SDK bridge.
 * In Storybook, we provide manifests with sandbox URLs pointing to safe targets.
 */

function withRegistryReset(Story: React.ComponentType) {
  useEffect(() => {
    return () => {
      useAppRegistryStore.setState({ apps: new Map(), status: 'idle', errors: [] });
    };
  }, []);
  return <Story />;
}

const meta: Meta<typeof SandboxedApp> = {
  title: 'Components/SandboxedApp',
  component: SandboxedApp,
  decorators: [
    (Story) => (
      <div
        style={{
          width: 600,
          height: 400,
          border: '1px solid #444',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#1e1e2e',
          position: 'relative',
        }}
      >
        <Story />
      </div>
    ),
    withRegistryReset,
  ],
};

export default meta;

type Story = StoryObj<typeof SandboxedApp>;

/**
 * Default: Renders an iframe with a sandbox URL pointing to a simple HTML page.
 * Uses about:blank as the sandbox URL, which renders a blank iframe.
 */
export const Default: Story = {
  render: () => {
    const manifest: AppManifest = useMemo(() => ({
      id: 'dev.archbase.sandbox-demo',
      name: 'sandbox_demo',
      version: '1.0.0',
      displayName: 'Sandbox Demo',
      entrypoint: '',
      remoteEntry: '',
      sandbox: {
        url: 'https://example.com',
        origin: '*',
      },
    }), []);

    return (
      <SandboxedApp
        appId="dev.archbase.sandbox-demo"
        windowId="sandbox-win-1"
        manifest={manifest}
      />
    );
  },
};

/**
 * Error state: When the manifest does not provide a sandbox.url,
 * SandboxedApp renders an error message.
 */
export const MissingSandboxUrl: Story = {
  render: () => {
    const manifest: AppManifest = useMemo(() => ({
      id: 'dev.archbase.sandbox-no-url',
      name: 'sandbox_no_url',
      version: '1.0.0',
      displayName: 'Sandbox No URL',
      entrypoint: '',
      remoteEntry: '',
      sandbox: true,
    }), []);

    return (
      <SandboxedApp
        appId="dev.archbase.sandbox-no-url"
        windowId="sandbox-win-2"
        manifest={manifest}
      />
    );
  },
};

/**
 * Error state: When the sandbox URL uses a disallowed scheme
 * (e.g., javascript:), SandboxedApp renders an error message.
 */
export const InvalidScheme: Story = {
  render: () => {
    const manifest: AppManifest = useMemo(() => ({
      id: 'dev.archbase.sandbox-bad-scheme',
      name: 'sandbox_bad_scheme',
      version: '1.0.0',
      displayName: 'Sandbox Bad Scheme',
      entrypoint: '',
      remoteEntry: '',
      sandbox: {
        url: 'data:text/html,<h1>Malicious</h1>',
        origin: '*',
      },
    }), []);

    return (
      <SandboxedApp
        appId="dev.archbase.sandbox-bad-scheme"
        windowId="sandbox-win-3"
        manifest={manifest}
      />
    );
  },
};
