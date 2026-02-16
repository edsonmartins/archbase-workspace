import { defineConfig } from '@rspack/cli';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import path from 'path';

export default defineConfig({
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    uniqueName: 'terminal',
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
  experiments: {
    css: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'terminal',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        zustand: { singleton: true, requiredVersion: '^5.0.0' },
        '@archbase/workspace-sdk': { singleton: true },
        '@archbase/workspace-state': { singleton: true },
      },
    }),
  ],
  devServer: {
    port: 3006,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
