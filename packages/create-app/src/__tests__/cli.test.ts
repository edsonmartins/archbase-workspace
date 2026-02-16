import { describe, it, expect } from 'vitest';
import { parseArgs } from '../cli';

describe('parseArgs', () => {
  // Help
  it('returns help when no args', () => {
    expect(parseArgs([])).toEqual({ command: 'help', port: 3010 });
  });

  it('returns help with --help flag', () => {
    expect(parseArgs(['--help'])).toEqual({ command: 'help', port: 3010 });
  });

  it('returns help with -h flag', () => {
    expect(parseArgs(['-h'])).toEqual({ command: 'help', port: 3010 });
  });

  // Implicit create (backwards compat)
  it('treats first non-command arg as app name (implicit create)', () => {
    const result = parseArgs(['my-app']);
    expect(result).toEqual({ command: 'create', appName: 'my-app', port: 3010 });
  });

  it('implicit create with --port', () => {
    const result = parseArgs(['my-app', '--port', '3006']);
    expect(result).toEqual({ command: 'create', appName: 'my-app', port: 3006 });
  });

  // Explicit create
  it('explicit create command', () => {
    const result = parseArgs(['create', 'my-app']);
    expect(result).toEqual({ command: 'create', appName: 'my-app', port: 3010 });
  });

  it('explicit create with --port', () => {
    const result = parseArgs(['create', 'my-app', '--port', '4000']);
    expect(result).toEqual({ command: 'create', appName: 'my-app', port: 4000 });
  });

  it('explicit create without app name', () => {
    const result = parseArgs(['create']);
    expect(result).toEqual({ command: 'create', appName: undefined, port: 3010 });
  });

  // Dev
  it('dev command with default port 3000', () => {
    const result = parseArgs(['dev']);
    expect(result).toEqual({ command: 'dev', port: 3000 });
  });

  it('dev command with custom port', () => {
    const result = parseArgs(['dev', '--port', '3001']);
    expect(result).toEqual({ command: 'dev', port: 3001 });
  });

  // Build
  it('build command', () => {
    const result = parseArgs(['build']);
    expect(result).toEqual({ command: 'build', port: 3010 });
  });

  // Publish
  it('publish command', () => {
    const result = parseArgs(['publish']);
    expect(result).toEqual({ command: 'publish', port: 3010 });
  });

  // Edge cases
  it('ignores invalid --port value', () => {
    const result = parseArgs(['dev', '--port', 'abc']);
    expect(result).toEqual({ command: 'dev', port: 3000 });
  });

  it('--port before command works', () => {
    const result = parseArgs(['--port', '5000', 'dev']);
    expect(result).toEqual({ command: 'dev', port: 5000 });
  });

  it('--help takes priority even with other args', () => {
    const result = parseArgs(['dev', '--help']);
    expect(result).toEqual({ command: 'help', port: 3010 });
  });
});
