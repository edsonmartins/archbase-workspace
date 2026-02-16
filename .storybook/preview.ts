import type { Preview } from '@storybook/react';
import '../packages/core/src/styles/global.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'desktop',
      values: [
        { name: 'desktop', value: '#1e293b' },
        { name: 'light', value: '#f8fafc' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
    layout: 'fullscreen',
  },
};

export default preview;
