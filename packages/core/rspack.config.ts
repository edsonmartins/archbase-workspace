import { defineConfig } from '@rspack/cli';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import path from 'path';

const MF_HELLO_WORLD_URL = process.env.MF_HELLO_WORLD_URL || 'http://localhost:3001';
const MF_CALCULATOR_URL = process.env.MF_CALCULATOR_URL || 'http://localhost:3002';
const MF_NOTES_URL = process.env.MF_NOTES_URL || 'http://localhost:3003';

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
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        zustand: { singleton: true, requiredVersion: '^5.0.0' },
        '@archbase/workspace-state': { singleton: true },
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
