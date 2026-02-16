/**
 * CLI argument parsing — extracted for testability.
 */

export type CommandType = 'create' | 'dev' | 'build' | 'publish' | 'help';

export interface ParsedCommand {
  command: CommandType;
  appName?: string;
  port: number;
}

const KNOWN_COMMANDS = new Set<string>(['create', 'dev', 'build', 'publish']);

/**
 * Parse CLI arguments into a structured command object.
 *
 * Supports two invocation styles for backwards compatibility:
 *   create-app my-app --port 3006        → implicit "create" command
 *   create-app create my-app --port 3006  → explicit "create" command
 */
export function parseArgs(argv: string[]): ParsedCommand {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    return { command: 'help', port: 3010 };
  }

  let port: number | undefined;
  const portIndex = argv.indexOf('--port');
  if (portIndex !== -1 && argv[portIndex + 1]) {
    const parsed = parseInt(argv[portIndex + 1], 10);
    if (!isNaN(parsed)) {
      port = parsed;
    }
  }

  // Filter out --port and its value for positional analysis
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port') {
      i++; // skip value
      continue;
    }
    if (argv[i] === '--help' || argv[i] === '-h') {
      continue;
    }
    positional.push(argv[i]);
  }

  if (positional.length === 0) {
    return { command: 'help', port: port ?? 3010 };
  }

  const first = positional[0];

  // Explicit command
  if (KNOWN_COMMANDS.has(first)) {
    const command = first as CommandType;
    const defaultPort = command === 'dev' ? 3000 : 3010;

    if (command === 'create') {
      return {
        command: 'create',
        appName: positional[1],
        port: port ?? defaultPort,
      };
    }

    return { command, port: port ?? defaultPort };
  }

  // Implicit create: first arg is the app name
  return {
    command: 'create',
    appName: first,
    port: port ?? 3010,
  };
}
