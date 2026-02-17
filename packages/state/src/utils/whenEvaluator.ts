export interface WhenContext {
  [key: string]: string | boolean | number | undefined;
}

/**
 * Evaluate a simple `when` expression against a context object.
 * Supports:
 *   - `key == value` -- equality check (string comparison)
 *   - `key != value` -- inequality check
 *   - `key` -- truthy check
 *   - `!key` -- falsy check
 *   - Multiple conditions with ` && `
 *   - Empty expression returns true
 */
export function evaluateWhen(expression: string, context: WhenContext): boolean {
  if (!expression || expression.trim() === '') return true;

  const conditions = expression.split('&&').map((s) => s.trim());

  for (const condition of conditions) {
    if (condition.includes('!=')) {
      const [key, value] = condition.split('!=').map((s) => s.trim());
      if (String(context[key] ?? '') === value) return false;
    } else if (condition.includes('==')) {
      const [key, value] = condition.split('==').map((s) => s.trim());
      if (String(context[key] ?? '') !== value) return false;
    } else if (condition.startsWith('!')) {
      const key = condition.slice(1).trim();
      if (context[key]) return false;
    } else {
      const key = condition.trim();
      if (!context[key]) return false;
    }
  }

  return true;
}
