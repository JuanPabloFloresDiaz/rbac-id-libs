# Copilot Instructions — `@oscardevpr/rbac-vue`

## What this package is
A Vue 3 + Pinia **RBAC library** published to GitHub Packages. It is a package inside a monorepo (`monorepo/packages/rbac-vue`). Consumers install it and call `app.use(RbacPlugin, options)`.

## Architecture layers (bottom → top)

| Layer | File(s) | Role |
|---|---|---|
| Config singleton | `src/config/rbacConfig.js` | Holds `authApiUrl`, `applicationId`, `debugMode`; set once at plugin install via `setRbacConfig()` |
| Core engine | `src/core/permissionEngine.js` | Pure functions only — `checkPermission(permissions, category, action, debugMode)` and `checkPermissionAny(permissions, action, debugMode)`. No imports. |
| HTTP | `src/http/createAuthApi.js` + `src/http/authService.js` | Axios factory with `withCredentials: true`. Response interceptor **unwraps `.data`** so all `authService` functions return the payload directly, not an Axios response object. |
| Pinia store | `src/store/useAuthStore.js` | Store id `'rbac-auth'`. Permissions shape: `Array<{ category: string, actions: string[] }>`. `checkAuth()` → `loadPermissions()` is the standard boot sequence. |
| Composable | `src/composables/usePermission.js` | `usePermission(category?)` — optional category scopes checks to one category; omit to search all categories. |
| UI gates | `src/directives/vCan.js`, `src/components/CanAccess.vue` | Both use `checkPermission` / `checkPermissionAny` directly from `rbacConfig` singleton. Registered globally by the plugin. |
| Plugin | `src/plugin/index.js` | Calls `setRbacConfig`, registers `v-can` directive and `<CanAccess>` component. **Pinia must be installed before this plugin.** |
| Seeder | `src/seeder/defineRbacSeed.js` + `src/seeder/runSeeder.js` | Fire-and-forget `POST /rbac/seed`. Never throws to consumer. |

## Critical patterns

### Permission check — always delegate to the engine
All permission checks (`CanAccess`, `vCan`, `usePermission`) call `checkPermission` / `checkPermissionAny` from `core/permissionEngine.js`. Never duplicate the lookup logic elsewhere.

### `debugMode` bypass
When `debugMode: true`, both engine functions return `true` unconditionally. Set via `VITE_APP_MODE === 'debugging'`.

### Permissions data shape
```js
// store.permissions
[{ category: 'Empleados', actions: ['Agregar empleados', 'Editar datos de empleado'] }]
```

### `v-can` vs `<CanAccess>` vs `usePermission`
- **Template with DOM element** → `v-can="{ category, action }"` (hides via `display:none`)
- **Template with component subtree** → `<CanAccess category action>` (skips rendering via `v-if`)
- **Script logic** → `const { hasAccess } = usePermission('Empleados')`

### Seeder usage (consumer project)
```js
// src/rbac.seed.js
import { defineRbacSeed } from '@oscardevpr/rbac-vue'
export default defineRbacSeed({
  Empleados: ['Agregar empleados', 'Editar datos de empleado'],
})
// then: app.use(RbacPlugin, { ..., seed: rbacSeed })
```

## Backend API endpoints consumed
All relative to `VITE_AUTH_API_URL`:
- `GET /user-sessions/verify-session`
- `GET /users/:id/application/:appId/get-user-type-actions`
- `POST /user-sessions/login` · `POST /user-sessions/login-by-core-token` · `POST /user-sessions/logout`
- `POST /rbac/seed` — body `{ categories: [{ name, actions[] }] }`

## Build & publish
```bash
pnpm build          # Vite library mode → dist/rbac-vue.js (ESM) + dist/rbac-vue.umd.cjs
pnpm dev            # watch mode
pnpm test           # vitest
```
`vue` and `pinia` are **externalized** (peer deps, not bundled). Published to GitHub Packages (`https://npm.pkg.github.com`) under `@oscardevpr` scope with restricted access.

## Public API surface (`src/index.js`)
`RbacPlugin`, `useAuthStore`, `usePermission`, `vCan`, `CanAccess`, `checkPermission`, `checkPermissionAny`
