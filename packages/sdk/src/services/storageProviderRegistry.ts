/**
 * StorageProvider abstraction layer.
 * All operations are async to allow pluggable backends (localStorage, IndexedDB, cloud).
 */
export interface StorageProvider {
  readonly name: string;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// ── Registry ──────────────────────────────────────────────

const providers = new Map<string, StorageProvider>();
let defaultProviderName = 'localStorage';

export function registerStorageProvider(provider: StorageProvider): void {
  providers.set(provider.name, provider);
}

export function setDefaultProvider(name: string): void {
  if (!providers.has(name)) {
    throw new Error(`Storage provider "${name}" not registered`);
  }
  defaultProviderName = name;
}

export function getStorageProvider(name?: string): StorageProvider {
  const providerName = name ?? defaultProviderName;
  const provider = providers.get(providerName);
  if (!provider) {
    throw new Error(`Storage provider "${providerName}" not registered`);
  }
  return provider;
}

export function listStorageProviders(): string[] {
  return Array.from(providers.keys());
}

// ── Built-in: LocalStorageProvider ────────────────────────

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'localStorage';

  constructor(private readonly prefix: string = '') {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(`${this.prefix}${key}`);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) keysToRemove.push(k);
    }
    for (const k of keysToRemove) localStorage.removeItem(k);
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) {
        result.push(k.slice(this.prefix.length));
      }
    }
    return result;
  }
}

// Auto-register the built-in localStorage provider with namespace prefix
registerStorageProvider(new LocalStorageProvider('archbase:'));
