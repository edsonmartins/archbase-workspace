# ADR-006: Content Security Policy

**Status**: Accepted
**Date**: 2026-02-16
**Deciders**: Archbase Workspace Team

## Context

The Archbase Workspace loads third-party micro-frontend apps via Module Federation and (optionally) sandboxed iframes. Without a Content Security Policy (CSP), any injected script or stylesheet could execute freely, creating XSS and data exfiltration risks.

## Decision

We adopt a **meta-tag CSP** in `packages/core/src/index.html` with a development-friendly policy:

```
default-src 'self';
script-src 'self' localhost:* 'unsafe-eval';
style-src 'self' 'unsafe-inline';
connect-src 'self' localhost:* ws://localhost:*;
img-src 'self' data: blob:;
font-src 'self' localhost:* data:;
frame-src localhost:*;
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
```

### Additional hardening directives

- **`font-src`** — allows fonts from self, localhost, and data URIs (inline font references).
- **`object-src 'none'`** — blocks `<object>`, `<embed>`, and `<applet>` elements to prevent plugin-based attacks.
- **`base-uri 'self'`** — prevents `<base>` tag injection that could redirect relative URLs to attacker-controlled domains.

### Why meta-tag instead of HTTP header?

- The workspace is a static SPA — there is no server to configure HTTP headers during development.
- Meta-tag CSP is well-supported across all modern browsers.
- For production deployments behind a reverse proxy (Nginx, Cloudflare, etc.), the CSP should be migrated to an HTTP header for stronger enforcement.

### Why `'unsafe-eval'`?

- Module Federation's runtime uses `new Function()` for module evaluation during development.
- This is a known limitation of the MF dev workflow. In production, `'unsafe-eval'` should be removed and replaced with nonce-based script loading.

### Why `'unsafe-inline'` for styles?

- CSS-in-JS libraries and inline styles from remote apps require this.
- Shadow DOM-isolated apps have their styles scoped regardless of this policy.

## Production Hardening Checklist

When deploying to production:

1. **Move CSP to HTTP header** — stronger enforcement, supports `report-uri`
2. **Remove `'unsafe-eval'`** — ensure MF runtime works without eval in prod builds
3. **Replace `'unsafe-inline'`** — use nonce-based approach (`'nonce-<random>'`)
4. **Restrict `localhost:*`** — replace with actual CDN/API domains
5. **Add `report-uri`** — collect CSP violation reports
6. **Add `frame-ancestors 'self'`** — prevent clickjacking (only works in HTTP header)

## Consequences

### Positive
- Blocks inline script injection (XSS mitigation)
- Restricts network connections to known origins
- Prevents unauthorized iframe embedding of external content
- Defense-in-depth layer alongside permission system and sandbox isolation

### Negative
- `'unsafe-eval'` weakens script protection during development
- `'unsafe-inline'` for styles doesn't prevent style injection attacks
- Meta-tag CSP cannot use `frame-ancestors` or `report-uri` directives

### Neutral
- No runtime performance impact
- No behavioral change for existing apps (all use localhost in dev)
