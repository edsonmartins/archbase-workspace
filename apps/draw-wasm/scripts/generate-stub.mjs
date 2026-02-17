import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

// Minimal valid WASM module (header only - magic bytes + version 1)
const wasmBytes = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, // \0asm magic
  0x01, 0x00, 0x00, 0x00, // version 1
]);

writeFileSync(join(outDir, 'draw.wasm'), wasmBytes);
console.log('Generated stub draw.wasm');
