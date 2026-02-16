/**
 * Scoped localStorage wrapper.
 * All keys are namespaced by appId to prevent conflicts.
 */
export function createStorageService(appId: string) {
  const prefix = `archbase:${appId}:`;

  return {
    get<T>(key: string): T | null {
      try {
        const raw = localStorage.getItem(`${prefix}${key}`);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    set(key: string, value: unknown) {
      try {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(value));
      } catch {
        // Storage full or unavailable — silently fail
      }
    },

    remove(key: string) {
      try {
        localStorage.removeItem(`${prefix}${key}`);
      } catch {
        // Storage unavailable — silently fail
      }
    },

    clear() {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) keysToRemove.push(k);
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    },

    keys(): string[] {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) {
          result.push(k.slice(prefix.length));
        }
      }
      return result;
    },
  };
}
