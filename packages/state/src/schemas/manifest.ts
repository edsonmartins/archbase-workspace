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

const sourceSchema = z.enum(['local', 'remote', 'registry']);

export const appManifestSchema = z.object({
  // Required fields
  id: z.string().min(1).regex(/^[a-z0-9.-]+$/, {
    message: 'id must be lowercase alphanumeric with dots and hyphens (reverse domain notation)',
  }),
  name: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, {
    message: 'version must follow semver format (e.g., "1.0.0")',
  }),
  entrypoint: z.string().min(1),
  remoteEntry: z.string().min(1),

  // Optional metadata
  displayName: z.string().optional(),
  description: z.string().optional(),
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
  contributes: contributionPointsSchema.optional(),
  activationEvents: z.array(activationEventSchema).optional(),
  lifecycle: lifecycleConfigSchema.optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  platform: platformConfigSchema.optional(),
  source: sourceSchema.optional(),
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
