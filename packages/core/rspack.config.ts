import { defineConfig } from '@rspack/cli';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import path from 'path';

const MF_HELLO_WORLD_URL = process.env.MF_HELLO_WORLD_URL || 'http://localhost:3001';
const MF_CALCULATOR_URL = process.env.MF_CALCULATOR_URL || 'http://localhost:3002';
const MF_NOTES_URL = process.env.MF_NOTES_URL || 'http://localhost:3003';
const MF_FILE_EXPLORER_URL = process.env.MF_FILE_EXPLORER_URL || 'http://localhost:3004';
const MF_SETTINGS_URL = process.env.MF_SETTINGS_URL || 'http://localhost:3005';
const MF_TERMINAL_URL = process.env.MF_TERMINAL_URL || 'http://localhost:3006';
const MF_AI_ASSISTANT_URL = process.env.MF_AI_ASSISTANT_URL || 'http://localhost:3007';

export default defineConfig({
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    uniqueName: 'desktop_shell',
  },
  experiments: {
    css: true,
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
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'desktop_shell',
      remotes: {
        hello_world: `hello_world@${MF_HELLO_WORLD_URL}/mf-manifest.json`,
        calculator: `calculator@${MF_CALCULATOR_URL}/mf-manifest.json`,
        notes: `notes@${MF_NOTES_URL}/mf-manifest.json`,
        file_explorer: `file_explorer@${MF_FILE_EXPLORER_URL}/mf-manifest.json`,
        settings: `settings@${MF_SETTINGS_URL}/mf-manifest.json`,
        terminal: `terminal@${MF_TERMINAL_URL}/mf-manifest.json`,
        ai_assistant: `ai_assistant@${MF_AI_ASSISTANT_URL}/mf-manifest.json`,
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        zustand: { singleton: true, requiredVersion: '^5.0.0' },
        '@archbase/workspace-state': { singleton: true },
        '@archbase/workspace-sdk': { singleton: true },
        '@archbase/ai-assistant': { singleton: true },
      },
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  builtins: {
    html: [
      {
        template: './src/index.html',
        title: 'Archbase Workspace',
      },
    ],
  },
});
