import type { StorybookConfig } from '@storybook/react-webpack5';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../packages/core/src/components/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@archbase/workspace-types': path.resolve(__dirname, '../packages/types/src'),
        '@archbase/workspace-state': path.resolve(__dirname, '../packages/state/src'),
        '@archbase/workspace-sdk': path.resolve(__dirname, '../packages/sdk/src'),
      };
    }
    return config;
  },
};

export default config;
