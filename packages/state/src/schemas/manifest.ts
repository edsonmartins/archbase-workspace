import { z } from 'zod';

// ============================================================
// Manifest Zod Schema (mirrors @archbase/workspace-types AppManifest)
// ============================================================

const windowConfigSchema = z.object({
  defaultWidth: z.number().positive().optional(),
  defaultHeight: z.number().positive().optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  resizable: z.boolean().optional(),
  maximizable: z.boolean().optional(),
  minimizable: z.boolean().optional(),
  closable: z.boolean().optional(),
  alwaysOnTop: z.boolean().optional(),
});

const permissionSchema = z.enum([
  'notifications',
  'storage',
  'clipboard.read',
  'clipboard.write',
  'filesystem.read',
  'filesystem.write',
  'network',
  'camera',
  'microphone',
  'collaboration',
]);

const commandSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().optional(),
  keybinding: z.string().optional(),
  category: z.string().optional(),
});

const menuItemSchema = z.object({
  command: z.string().min(1),
  group: z.string().optional(),
  when: z.string().optional(),
});

const menuContributionsSchema = z.object({
  application: z.array(menuItemSchema).optional(),
  context: z.array(menuItemSchema).optional(),
  window: z.array(menuItemSchema).optional(),
});

const widgetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  component: z.string().min(1),
  defaultLocation: z.enum(['statusBar', 'sidebar', 'panel']),
});

const settingSchema = z.object({
  key: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean']),
  default: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().min(1),
});

const contributionPointsSchema = z.object({
  commands: z.array(commandSchema).optional(),
  menus: menuContributionsSchema.optional(),
  widgets: z.array(widgetSchema).optional(),
  settings: z.array(settingSchema).optional(),
});

const activationEventSchema = z
  .string()
  .min(1)
  .refine(
    (val) =>
      val === 'onDesktopReady' ||
      val.startsWith('onCommand:') ||
      val.startsWith('onFileType:') ||
      val.startsWith('onShortcut:') ||
      val.startsWith('onSchedule:'),
    {
      message:
        'Must be "onDesktopReady" or start with "onCommand:", "onFileType:", "onShortcut:", or "onSchedule:"',
    },
  );

const lifecycleConfigSchema = z.object({
  singleton: z.boolean().optional(),
  background: z.boolean().optional(),
  preload: z.boolean().optional(),
  autoStart: z.boolean().optional(),
});

const platformConfigSchema = z.object({
  os: z.array(z.enum(['windows', 'macos', 'linux'])).optional(),
  browser: z.array(z.enum(['chrome', 'edge', 'firefox', 'safari'])).optional(),
  minVersion: z.string().optional(),
});

const authorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  url: z.string().url().optional(),
});

const repositorySchema = z.object({
  type: z.enum(['git', 'svn']),
  url: z.string().min(1),
});

const isolationConfigSchema = z.object({
  css: z.union([z.boolean(), z.literal('shadow')]).optional(),
}).optional();

/** Valid HTML sandbox permission tokens (excluding dangerous ones) */
const VALID_SANDBOX_TOKENS = [
  'allow-downloads',
  'allow-forms',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-scripts',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-top-navigation-to-custom-protocols',
] as const;

const sandboxTokenSchema = z.string().refine(
  (val) => (VALID_SANDBOX_TOKENS as readonly string[]).includes(val),
  { message: 'Invalid or dangerous sandbox token. Allowed: allow-downloads, allow-forms, allow-modals, allow-popups, allow-scripts, etc. "allow-same-origin" is forbidden.' },
);

const sandboxConfigSchema = z.union([
  z.boolean(),
  z.object({
    url: z.string().url().optional(),
    allow: z.array(sandboxTokenSchema).optional(),
    origin: z.string().url().optional(),
  }),
]).optional();

const sourceSchema = z.enum(['local', 'remote', 'registry']);

// ── WebAssembly config schemas ──

const wasmMemoryConfigSchema = z.object({
  initialPages: z.number().int().positive().optional(),
  maxPages: z.number().int().positive().optional(),
  shared: z.boolean().optional(),
});

const wasmConfigSchema = z.object({
  wasmUrl: z.string().min(1),
  jsGlueUrl: z.string().min(1).optional(),
  moduleType: z.enum(['emscripten', 'wasm-pack', 'standalone']),
  renderMode: z.enum(['canvas-2d', 'canvas-webgl', 'dom', 'hybrid']),
  memory: wasmMemoryConfigSchema.optional(),
  env: z.record(z.string(), z.string()).optional(),
  initFunction: z.string().optional(),
  assets: z.array(z.string()).optional(),
  streamingCompilation: z.boolean().optional(),
});

const runtimeSchema = z.enum(['mf', 'wasm', 'iframe']);

export const appManifestSchema = z.object({
  // Required fields
  id: z.string().min(1).regex(/^[a-z0-9.-]+$/, {
    message: 'id must be lowercase alphanumeric with dots and hyphens (reverse domain notation)',
  }),
  name: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, {
    message: 'version must follow semver format (e.g., "1.0.0")',
  }),
  entrypoint: z.string(),
  remoteEntry: z.string(),

  // Optional metadata
  displayName: z.string().optional(),
  description: z.string().max(500).optional(),
  author: authorSchema.optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: repositorySchema.optional(),
  keywords: z.array(z.string()).optional(),
  icon: z.string().optional(),
  screenshots: z.array(z.string()).optional(),

  // Optional configuration
  window: windowConfigSchema.optional(),
  shared: z.record(z.string(), z.string()).optional(),
  exposes: z.record(z.string(), z.string()).optional(),
  permissions: z.array(permissionSchema).optional(),
  isolation: isolationConfigSchema,
  sandbox: sandboxConfigSchema,
  contributes: contributionPointsSchema.optional(),
  activationEvents: z.array(activationEventSchema).optional(),
  lifecycle: lifecycleConfigSchema.optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  platform: platformConfigSchema.optional(),
  source: sourceSchema.optional(),

  // WebAssembly support
  runtime: runtimeSchema.optional(),
  wasm: wasmConfigSchema.optional(),
}).superRefine((data, ctx) => {
  // For non-WASM apps, entrypoint and remoteEntry must be non-empty
  if (!data.wasm) {
    if (!data.entrypoint) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entrypoint'],
        message: 'entrypoint is required for non-WASM apps',
      });
    }
    if (!data.remoteEntry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['remoteEntry'],
        message: 'remoteEntry is required for non-WASM apps',
      });
    }
  }
  // runtime='wasm' requires wasm config
  if (data.runtime === 'wasm' && !data.wasm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wasm'],
      message: "runtime 'wasm' requires 'wasm' configuration",
    });
  }
  // runtime='iframe' requires sandbox config
  if (data.runtime === 'iframe' && !data.sandbox) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sandbox'],
      message: "runtime 'iframe' requires 'sandbox' configuration",
    });
  }
});

export type ValidatedManifest = z.infer<typeof appManifestSchema>;

/** Validates manifest data, throwing ZodError on failure */
export function validateManifest(data: unknown): ValidatedManifest {
  return appManifestSchema.parse(data);
}

/** Validates manifest data, returning a result object instead of throwing */
export function validateManifestSafe(
  data: unknown,
): { success: true; data: ValidatedManifest } | { success: false; error: z.ZodError } {
  const result = appManifestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
