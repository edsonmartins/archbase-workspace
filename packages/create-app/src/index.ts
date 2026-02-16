#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'basic');

function usage(): void {
  console.log(`
Usage: create-app <app-name> [--port <port>]

Creates a new Archbase Workspace app from template.

Options:
  --port <number>  Dev server port (default: 3010)

Example:
  npx @archbase/workspace-create-app my-app --port 3006
`);
}

function toSnakeCase(name: string): string {
  return name.replace(/-/g, '_');
}

function toPascalCase(name: string): string {
  return name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function scaffold(appName: string, port: number): void {
  const targetDir = path.resolve(process.cwd(), appName);

  if (fs.existsSync(targetDir)) {
    console.error(`Error: Directory "${appName}" already exists.`);
    process.exit(1);
  }

  const appId = `dev.archbase.${appName}`;
  const mfName = toSnakeCase(appName);
  const displayName = toPascalCase(appName);

  const replacements: Record<string, string> = {
    '{{APP_NAME}}': appName,
    '{{APP_ID}}': appId,
    '{{MF_NAME}}': mfName,
    '{{DISPLAY_NAME}}': displayName,
    '{{PORT}}': String(port),
  };

  function processDir(srcDir: string, destDir: string): void {
    fs.mkdirSync(destDir, { recursive: true });

    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        processDir(srcPath, destPath);
      } else {
        let content = fs.readFileSync(srcPath, 'utf-8');
        for (const [placeholder, value] of Object.entries(replacements)) {
          content = content.replaceAll(placeholder, value);
        }
        fs.writeFileSync(destPath, content);
      }
    }
  }

  processDir(TEMPLATE_DIR, targetDir);

  console.log(`\nCreated ${appName} at ${targetDir}\n`);
  console.log('Next steps:');
  console.log(`  1. Add "${appName}" to your workspace pnpm-workspace.yaml`);
  console.log(`  2. Run: pnpm install`);
  console.log(`  3. Run: pnpm --filter @archbase/${appName} dev`);
  console.log(`  4. Add the manifest to packages/core/src/knownManifests.ts`);
  console.log('');
}

// Parse CLI args
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
}

const appName = args[0];
let port = 3010;

const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
  port = parseInt(args[portIndex + 1], 10);
  if (isNaN(port)) {
    console.error('Error: --port must be a number');
    process.exit(1);
  }
}

if (!/^[a-z][a-z0-9-]*$/.test(appName)) {
  console.error('Error: app name must be lowercase alphanumeric with hyphens (e.g. my-app)');
  process.exit(1);
}

scaffold(appName, port);
