import { defineConfig } from '@rspack/cli';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import { CopyRspackPlugin, DefinePlugin, HtmlRspackPlugin } from '@rspack/core';
import path from 'path';

const MF_HELLO_WORLD_URL = process.env.MF_HELLO_WORLD_URL || 'http://localhost:3001';
const MF_CALCULATOR_URL = process.env.MF_CALCULATOR_URL || 'http://localhost:3002';
const MF_NOTES_URL = process.env.MF_NOTES_URL || 'http://localhost:3003';
const MF_FILE_EXPLORER_URL = process.env.MF_FILE_EXPLORER_URL || 'http://localhost:3004';
const MF_SETTINGS_URL = process.env.MF_SETTINGS_URL || 'http://localhost:3005';
const MF_TERMINAL_URL = process.env.MF_TERMINAL_URL || 'http://localhost:3006';
const MF_AI_ASSISTANT_URL = process.env.MF_AI_ASSISTANT_URL || 'http://localhost:3007';
const MF_MARKETPLACE_URL = process.env.MF_MARKETPLACE_URL || 'http://localhost:3008';
const MF_TICKET_SYSTEM_URL = process.env.MF_TICKET_SYSTEM_URL || 'http://localhost:3010';

const isDev = process.env.NODE_ENV !== 'production';

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
    new DefinePlugin({
      'process.env.MF_HELLO_WORLD_URL': JSON.stringify(MF_HELLO_WORLD_URL),
      'process.env.MF_CALCULATOR_URL': JSON.stringify(MF_CALCULATOR_URL),
      'process.env.MF_NOTES_URL': JSON.stringify(MF_NOTES_URL),
      'process.env.MF_FILE_EXPLORER_URL': JSON.stringify(MF_FILE_EXPLORER_URL),
      'process.env.MF_SETTINGS_URL': JSON.stringify(MF_SETTINGS_URL),
      'process.env.MF_TERMINAL_URL': JSON.stringify(MF_TERMINAL_URL),
      'process.env.MF_AI_ASSISTANT_URL': JSON.stringify(MF_AI_ASSISTANT_URL),
      'process.env.MF_MARKETPLACE_URL': JSON.stringify(MF_MARKETPLACE_URL),
      'process.env.MF_DRAW_WASM_URL': JSON.stringify(process.env.MF_DRAW_WASM_URL || 'http://localhost:3009'),
      'process.env.MF_TICKET_SYSTEM_URL': JSON.stringify(MF_TICKET_SYSTEM_URL),
    }),
    new HtmlRspackPlugin({
      template: './src/index.html',
      title: 'Archbase Workspace',
    }),
    new CopyRspackPlugin({
      patterns: [{ from: 'public', to: '.' }],
    }),
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
        marketplace: `marketplace@${MF_MARKETPLACE_URL}/mf-manifest.json`,
        ticket_system: `ticket_system@${MF_TICKET_SYSTEM_URL}/mf-manifest.json`,
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        zustand: { singleton: true, requiredVersion: '^5.0.0' },
        '@archbase/workspace-state': { singleton: true, requiredVersion: false },
        '@archbase/workspace-sdk': { singleton: true, requiredVersion: false },
        '@archbase/ai-assistant': { singleton: true, requiredVersion: false },
      },
      // Disable live type-hint WebSocket in dev (avoids noise in console)
      dts: isDev ? false : { generateTypes: true },
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
});
