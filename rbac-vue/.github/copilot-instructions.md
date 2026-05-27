# Copilot Instructions — @oscardevpr/rbac-vue

## What this package is
Vue 3 + Pinia RBAC library published to GitHub Packages. Consumer entry point is `app.use(RbacPlugin, authApiUrl, applicationId, debugMode?, loginRoute?)`.

- Package docs: [rbac-vue/README.md](rbac-vue/README.md)
- Shared endpoints: [docs/endpoints.md](docs/endpoints.md)

## Critical patterns

- Plugin install order: `app.use(createPinia())` must run before `app.use(RbacPlugin, ...)`.
- Permission checks always delegate to `checkPermission` / `checkPermissionAny` from [rbac-core/src/engine/permissionEngine.ts](rbac-core/src/engine/permissionEngine.ts).
- `debugMode` bypass: set via `VITE_APP_MODE === 'debugging'`; all gates return `true`.
- HTTP client uses `createAuthApi()` from [rbac-core/src/http/createAuthApi.ts](rbac-core/src/http/createAuthApi.ts) with `withCredentials: true` and unwrapped `response.data`.

## Build & test (from monorepo root)
```bash
pnpm --filter @oscardevpr/rbac-vue build
pnpm --filter @oscardevpr/rbac-vue dev
pnpm --filter @oscardevpr/rbac-vue test
```
