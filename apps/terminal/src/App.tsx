import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const PROMPT = '\x1b[32marchbase\x1b[0m:\x1b[34m~\x1b[0m$ ';
const VERSION = '0.1.0';

const HELP_TEXT = [
  'Available commands:',
  '  help       Show this help message',
  '  echo       Print arguments to the terminal',
  '  clear      Clear the terminal screen',
  '  date       Show the current date and time',
  '  whoami     Show the current user',
  '  ls         List files (simulated)',
  '  pwd        Print working directory (simulated)',
  '  version    Show terminal version',
  '',
].join('\r\n');

const FS_FILES = [
  'README.md',
  'package.json',
  'tsconfig.json',
  'src/',
  'dist/',
  'node_modules/',
];

function processCommand(cmd: string): string {
  const parts = cmd.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1);

  switch (command) {
    case '':
      return '';
    case 'help':
      return HELP_TEXT;
    case 'echo':
      return args.join(' ');
    case 'clear':
      return '\x1b[CLEAR]'; // Special marker handled by caller
    case 'date':
      return new Date().toString();
    case 'whoami':
      return 'archbase-user';
    case 'ls':
      return FS_FILES.join('  ');
    case 'pwd':
      return '/home/archbase-user/workspace';
    case 'version':
      return `Archbase Workspace Terminal v${VERSION}`;
    default:
      return `command not found: ${command}`;
  }
}

export default function TerminalApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        cursor: '#3b82f6',
        selectionBackground: '#334155',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 14,
      lineHeight: 1.2,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;

    // Welcome message
    term.writeln(`\x1b[1mArchbase Workspace Terminal v${VERSION}\x1b[0m`);
    term.writeln('Type "help" for available commands.\r\n');
    term.write(PROMPT);

    let currentLine = '';
    let cursorPos = 0;

    term.onData((data) => {
      const code = data.charCodeAt(0);

      if (data === '\r') {
        // Enter
        term.write('\r\n');
        const output = processCommand(currentLine);
        if (output === '\x1b[CLEAR]') {
          term.clear();
        } else if (output) {
          term.writeln(output);
        }
        currentLine = '';
        cursorPos = 0;
        term.write(PROMPT);
      } else if (code === 127) {
        // Backspace
        if (cursorPos > 0) {
          currentLine = currentLine.slice(0, cursorPos - 1) + currentLine.slice(cursorPos);
          cursorPos--;
          term.write('\b \b');
        }
      } else if (code === 3) {
        // Ctrl+C
        term.write('^C\r\n');
        currentLine = '';
        cursorPos = 0;
        term.write(PROMPT);
      } else if (code === 12) {
        // Ctrl+L — clear
        term.clear();
        currentLine = '';
        cursorPos = 0;
        term.write(PROMPT);
      } else if (code >= 32) {
        // Printable characters
        currentLine = currentLine.slice(0, cursorPos) + data + currentLine.slice(cursorPos);
        cursorPos += data.length;
        term.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // ignore fit errors during cleanup
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#0f172a' }}
    />
  );
}
