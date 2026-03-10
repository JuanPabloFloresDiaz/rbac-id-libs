# Copilot Instructions — `rbac-id-libs`

## What this repo is
Private monorepo of three **TypeScript** library packages published to GitHub Packages under `@oscardevpr`. All packages wrap/extend the `itr-authenticator` auth service.

```
packages/
  rbac-core/   — framework-agnostic base (config singleton, permission engine, HTTP, seeder)
  rbac-node/   — Express middlewares (guard, audit, sessionCheck) — depends on rbac-core
  rbac-vue/    — Vue 3 + Pinia plugin (store, composables, directive, component) — depends on rbac-core
```

## Dependency graph — build order matters
```
rbac-core  ←  rbac-node
rbac-core  ←  rbac-vue
```
Always build `rbac-core` first. In workspace, both use `"@oscardevpr/rbac-core": "workspace:*"`.

## Key architectural decisions

### Config singleton (`rbac-core/src/config/rbacConfig.ts`)
Module-level mutable object. Set **once** at startup via `setRbacConfig()`. Not reactive — reactivity lives in the Pinia store / composables. Direct mutation is intentional.

### Permission engine (`rbac-core/src/engine/permissionEngine.ts`)
Pure functions, zero imports. Every UI gate (`v-can`, `<CanAccess>`, `usePermission`) and every middleware delegates to `checkPermission` / `checkPermissionAny`. **Never duplicate lookup logic elsewhere.**

### Permissions data shape (used everywhere)
```ts
Permission[] = [{ category: 'Empleados', actions: ['Agregar empleados', 'Eliminar'] }]
```

### `debugMode` bypass
`debugMode: true` → all permission checks return `true`, all middlewares call `next()` immediately. Set via `VITE_APP_MODE === 'debugging'` (Vue) or `NODE_ENV !== 'production'` (Node).

### axios is **bundled** in rbac-core (not external)
`vue`, `pinia`, `vue-router`, `express` are **externalized** (peer deps). Don't add them to `rollupOptions.external` in rbac-core.

### HTTP layer (`rbac-core/src/http/`)
`createAuthApi()` returns an axios instance with `withCredentials: true`. The response interceptor **unwraps `.data`** — all `authService` functions return the payload directly, not an AxiosResponse.

### Audit middleware — fire-and-forget pattern
`next()` is called **before** the HTTP audit call. Errors are swallowed. Never await audit calls. This is intentional for `rbac-node/src/middlewares/auditMiddleware.ts`.

### Factory pattern in rbac-node
`createRbacNode(options)` is the single entry point. It validates required fields, calls `setRbacConfig()`, builds a shared `RbacNodeCtx`, and returns `{ guard, audit(), sessionCheck }`. Each middleware is constructed by a `make*` factory that receives `ctx`.

## Backend API endpoints (all relative to `authApiUrl`)
| Endpoint | Consumer |
|---|---|
| `POST /api/v1/permissions/check` | `authGuard` |
| `GET /api/v1/user-sessions/verify-active-session` | `sessionCheck` |
| `POST /api/v1/audit-logs` | `auditMiddleware` |
| `GET /user-sessions/verify-session` | `rbac-vue` store `checkAuth()` |
| `GET /users/:id/application/:appId/get-user-type-actions` | `rbac-vue` store `loadPermissions()` |
| `POST /rbac/seed` | `runSeeder` |

## Build & dev commands
```bash
# From monorepo root (C:\…\monorepo):
pnpm install                                   # links all workspace packages

pnpm --filter @oscardevpr/rbac-core build      # must run first
pnpm --filter @oscardevpr/rbac-node build
pnpm --filter @oscardevpr/rbac-vue  build

pnpm --filter "@oscardevpr/*" build            # builds all (order not guaranteed — build core first)
```

## Publish to GitHub Packages
Push a tag `v*.*.*` — the workflow `.github/workflows/publish.yml` builds and publishes all three packages in dependency order. Manual: `pnpm build && pnpm publish` inside each package dir.

## rbac-vue: plugin install order
```ts
app.use(createPinia())            // ← MUST come before RbacPlugin
app.use(RbacPlugin, { authApiUrl, applicationId, seed? })
```

## rbac-vue: which gate to use
| Situation | Use |
|---|---|
| Hide a DOM element | `v-can="{ category, action }"` — hides via `display:none` |
| Skip rendering a subtree | `<CanAccess category action>` — `v-if`, node never mounts |
| Script logic | `const { hasAccess } = usePermission('Category')` |

## Consuming packages locally (monorepo)
```json
"@oscardevpr/rbac-node": "workspace:*"
```
`workspace:*` resolves to the local `dist/` in development. In production (outside monorepo), pnpm replaces it with the published version from GitHub Packages — requires `.npmrc` with `@oscardevpr:registry=https://npm.pkg.github.com` and `GITHUB_TOKEN` with `read:packages` scope.
