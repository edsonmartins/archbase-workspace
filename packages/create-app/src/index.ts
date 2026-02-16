#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { parseArgs, type ParsedCommand } from './cli';

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'basic');

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

function runDev(port: number): void {
  console.log(`Starting dev server on port ${port}...`);
  execSync(`npx rspack serve --port ${port}`, { stdio: 'inherit' });
}

function runBuild(): void {
  console.log('Building app...');
  execSync('npx rspack build', { stdio: 'inherit' });
}

function runPublish(): void {
  console.log('');
  console.log('Publish is not yet available.');
  console.log('A registry service for Archbase Workspace apps is planned for a future release.');
  console.log('For now, deploy your built assets to any static hosting provider.');
  console.log('');
}

function printUsage(): void {
  console.log(`
Usage: create-app <command> [options]

Commands:
  create <app-name>   Create a new Archbase Workspace app from template
  dev                 Start the dev server (rspack serve)
  build               Build the app for production (rspack build)
  publish             Publish to registry (coming soon)

Options:
  --port <number>     Dev server port (default: 3010 for create, 3000 for dev)
  --help, -h          Show this help message

Examples:
  npx @archbase/workspace-create-app my-app --port 3006
  npx @archbase/workspace-create-app create my-app --port 3006
  npx @archbase/workspace-create-app dev --port 3001
  npx @archbase/workspace-create-app build
`);
}

// Main
const parsed: ParsedCommand = parseArgs(process.argv.slice(2));

switch (parsed.command) {
  case 'help':
    printUsage();
    process.exit(0);
    break;
  case 'create':
    if (!parsed.appName) {
      console.error('Error: app name is required for create command');
      printUsage();
      process.exit(1);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(parsed.appName)) {
      console.error('Error: app name must be lowercase alphanumeric with hyphens (e.g. my-app)');
      process.exit(1);
    }
    scaffold(parsed.appName, parsed.port);
    break;
  case 'dev':
    runDev(parsed.port);
    break;
  case 'build':
    runBuild();
    break;
  case 'publish':
    runPublish();
    break;
}
