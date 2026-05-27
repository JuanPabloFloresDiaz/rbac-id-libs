# Copilot Instructions — rbac-id-libs

## What this repo is
Private monorepo of three TypeScript library packages published to GitHub Packages under `@oscardevpr`. Each wraps/extends the `itr-authenticator` auth service.

- Overview: [README.md](README.md)
- Package docs: [rbac-core/README.md](rbac-core/README.md), [rbac-node/README.md](rbac-node/README.md), [rbac-vue/README.md](rbac-vue/README.md)
- Endpoint specs: [docs/endpoints.md](docs/endpoints.md)

## Dependency graph (build order matters)
```
rbac-core  ←  rbac-node
rbac-core  ←  rbac-vue
```
Always build `rbac-core` first. In workspace, both dependents use `"@oscardevpr/rbac-core": "workspace:*"`.

## Build commands (from monorepo root)
```bash
pnpm install

pnpm --filter @oscardevpr/rbac-core build
pnpm --filter @oscardevpr/rbac-node build
pnpm --filter @oscardevpr/rbac-vue  build
```

## Key architectural rules

- Config singleton: `setRbacConfig()` writes a module-level object in [rbac-core/src/config/rbacConfig.ts](rbac-core/src/config/rbacConfig.ts); call once at startup.
- Permission engine: only use `checkPermission` / `checkPermissionAny` from [rbac-core/src/engine/permissionEngine.ts](rbac-core/src/engine/permissionEngine.ts); do not duplicate logic.
- `debugMode` bypass: `true` makes all permission checks succeed and middlewares call `next()` immediately.
- HTTP layer: `createAuthApi()` in [rbac-core/src/http/createAuthApi.ts](rbac-core/src/http/createAuthApi.ts) sets `withCredentials: true` and unwraps `response.data`.
- Audit middleware: fire-and-forget by design; `next()` runs before the HTTP call in [rbac-node/src/middlewares/auditMiddleware.ts](rbac-node/src/middlewares/auditMiddleware.ts).
- rbac-node entry point: `createRbacNode(...)` validates inputs, calls `setRbacConfig()`, and constructs shared context in [rbac-node/src/createRbacNode.ts](rbac-node/src/createRbacNode.ts).

## Common pitfalls

- Build order is strict; avoid `pnpm --filter "@oscardevpr/*" build` unless you build `rbac-core` first.
- `setRbacConfig()` is not idempotent; do not call it multiple times in the same runtime.
