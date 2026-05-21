---
name: implement-rbac-vue-wrapper
description: 
  Step-by-step guide to create a new framework adapter package (React, Svelte,
  Angular, Solid, etc.) on top of @oscardevpr/rbac-core. Use this skill when
  the user asks to add RBAC support for any front-end framework other than Vue.
Keywords:  
  new adapter, new wrapper, react rbac, svelte rbac, framework plugin,
  rbac adapter, implement rbac for react/svelte/angular/solid.
---

# Skill — Implement a New Framework Adapter for `@oscardevpr/rbac-core`

## Goal

Create a new package `packages/rbac-<framework>` that wraps the framework-agnostic
`@oscardevpr/rbac-core` and exposes idiomatic primitives for the target framework
(`usePermission` hook for React, stores for Svelte, services for Angular, etc.).

The public API surface of **every adapter** must mirror `@oscardevpr/rbac-vue` so
consumers can switch frameworks without relearning the RBAC contract.

---

## Architecture reference

```
@oscardevpr/rbac-core          ← pure TS, no UI deps (owns engine, config, http, seeder)
       ↑
@oscardevpr/rbac-vue           ← adapter: composables, directives, plugin
@oscardevpr/rbac-react         ← adapter: hooks, context provider, HOC
@oscardevpr/rbac-svelte        ← adapter: stores, action, component
@oscardevpr/rbac-angular       ← adapter: service, guard, directive, module
```

---

## Step-by-step instructions

### Step 1 — Scaffold the package

Create `packages/rbac-<framework>/` with the following files.

**`package.json`**
```json
{
  "name": "@oscardevpr/rbac-<framework>",
  "version": "1.0.0",
  "description": "RBAC adapter for <Framework>",
  "type": "module",
  "main": "./dist/rbac-<framework>.umd.cjs",
  "module": "./dist/rbac-<framework>.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/rbac-<framework>.js",
      "require": "./dist/rbac-<framework>.umd.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@oscardevpr/rbac-core": "workspace:*"
  },
  "peerDependencies": {
    "<framework-peer>": "^<version>"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.4.0",
    "vite-plugin-dts": "^3.9.0"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  }
}
```

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**`vite.config.ts`**
```ts
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true, rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RbacFramework',
      fileName: 'rbac-<framework>'
    },
    rollupOptions: {
      // Never bundle peer deps or rbac-core
      external: ['<framework-peer>', '@oscardevpr/rbac-core'],
      output: {
        globals: {
          '<framework-peer>': '<GlobalName>',
          '@oscardevpr/rbac-core': 'RbacCore'
        }
      }
    }
  }
})
```

---

### Step 2 — Implement the auth state store

Every adapter needs a **reactive auth state** equivalent to `useAuthStore` in
the Vue adapter. It must hold:

| Field | Type | Description |
|---|---|---|
| `isAuthenticated` | `boolean` | Session validity flag |
| `userData` | `User \| null` | Authenticated user object |
| `permissions` | `Permission[]` | Flat list from the API |
| `userType` | `UserType \| null` | Role/type metadata |
| `application` | `Application \| null` | App metadata |

All types are imported from `@oscardevpr/rbac-core`:
```ts
import type { User, Permission, UserType, Application } from '@oscardevpr/rbac-core'
import {
  getAuthenticatedUserData,
  getUserTypeAndActions,
  logInWithCredentials,
  logInByCoreToken,
  signOut
} from '@oscardevpr/rbac-core'
```

**Framework-specific implementations:**

#### React — Zustand store (recommended) or Context + useReducer

```ts
// src/store/useAuthStore.ts
import { create } from 'zustand'
import type { User, Permission, UserType, Application } from '@oscardevpr/rbac-core'
import {
  getAuthenticatedUserData,
  getUserTypeAndActions,
  logInWithCredentials,
  logInByCoreToken,
  signOut
} from '@oscardevpr/rbac-core'

interface AuthState {
  isAuthenticated: boolean
  userData: User | null
  permissions: Permission[]
  userType: UserType | null
  application: Application | null
}

interface AuthActions {
  checkAuth: () => Promise<void>
  loadPermissions: (userId: string | number) => Promise<void>
  loginWithCredentials: (payload: { user_name: string; password: string }) => Promise<void>
  loginByCoreToken: (token: string) => Promise<void>
  logOut: () => Promise<void>
  getActionsByCategory: (category: string) => string[]
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  isAuthenticated: false,
  userData: null,
  permissions: [],
  userType: null,
  application: null,

  getActionsByCategory(category) {
    const entry = get().permissions.find((p) => p.category === category)
    return entry?.actions ?? []
  },

  async checkAuth() {
    const data = await getAuthenticatedUserData()
    set({ userData: data.user, isAuthenticated: true })
    if (data.user?.id) await get().loadPermissions(data.user.id)
  },

  async loadPermissions(userId) {
    const info = await getUserTypeAndActions(userId)
    set({ application: info.application, userType: info.userType, permissions: info.permissions })
  },

  async loginWithCredentials(payload) {
    await logInWithCredentials(payload)
    set({ isAuthenticated: true })
  },

  async loginByCoreToken(token) {
    await logInByCoreToken({ token })
    set({ isAuthenticated: true })
  },

  async logOut() {
    await signOut()
    set({ isAuthenticated: false, userData: null, permissions: [], userType: null, application: null })
  }
}))
```

#### Svelte — writable store

```ts
// src/store/authStore.ts
import { writable, derived, get } from 'svelte/store'
import type { User, Permission, UserType, Application } from '@oscardevpr/rbac-core'
import {
  getAuthenticatedUserData,
  getUserTypeAndActions,
  logInWithCredentials,
  signOut
} from '@oscardevpr/rbac-core'

export const isAuthenticated = writable(false)
export const userData        = writable<User | null>(null)
export const permissions     = writable<Permission[]>([])
export const userType        = writable<UserType | null>(null)
export const application     = writable<Application | null>(null)

export function getActionsByCategory(category: string): string[] {
  const perms = get(permissions)
  return perms.find((p) => p.category === category)?.actions ?? []
}

export async function checkAuth() {
  const data = await getAuthenticatedUserData()
  userData.set(data.user)
  isAuthenticated.set(true)
  if (data.user?.id) await loadPermissions(data.user.id)
}

export async function loadPermissions(userId: string | number) {
  const info = await getUserTypeAndActions(userId)
  application.set(info.application)
  userType.set(info.userType)
  permissions.set(info.permissions)
}

export async function logOut() {
  await signOut()
  isAuthenticated.set(false)
  userData.set(null)
  permissions.set([])
  userType.set(null)
  application.set(null)
}
```

---

### Step 3 — Implement `usePermission`

The core permission hook delegates entirely to the engine from `@oscardevpr/rbac-core`.

```ts
import { checkPermission, checkPermissionAny, rbacConfig } from '@oscardevpr/rbac-core'
```

#### React

```ts
// src/composables/usePermission.ts
import { useAuthStore } from '../store/useAuthStore'
import { checkPermission, checkPermissionAny, rbacConfig } from '@oscardevpr/rbac-core'

export function usePermission(category?: string) {
  const { permissions, userData, userType, isAuthenticated } = useAuthStore()

  const hasAccess = (action: string): boolean => {
    if (category !== undefined) {
      return checkPermission(permissions, category, action, rbacConfig.debugMode)
    }
    return checkPermissionAny(permissions, action, rbacConfig.debugMode)
  }

  return { hasAccess, userData, userType, isAuthenticated }
}
```

#### Svelte

```ts
// src/composables/usePermission.ts
import { derived } from 'svelte/store'
import { permissions } from '../store/authStore'
import { checkPermission, checkPermissionAny, rbacConfig } from '@oscardevpr/rbac-core'

export function usePermission(category?: string) {
  const hasAccess = (action: string): boolean => {
    // call in reactive contexts by passing $permissions
    return category !== undefined
      ? checkPermission(get(permissions), category, action, rbacConfig.debugMode)
      : checkPermissionAny(get(permissions), action, rbacConfig.debugMode)
  }

  return { hasAccess }
}
```

---

### Step 4 — Implement the session guard

On session failure: call `onError` (if provided) then redirect. Skip redirect in `debugMode`.

```ts
import { rbacConfig, type ApiError } from '@oscardevpr/rbac-core'
// Use the framework's navigation API (React Router navigate, SvelteKit goto, etc.)
```

Pattern:
```ts
async function verifySession() {
  try {
    await authStore.checkAuth()
  } catch (err) {
    onError?.(err as ApiError)
    if (!rbacConfig.debugMode) {
      navigate(redirectTo ?? rbacConfig.loginRoute ?? '/login')
    }
  }
}
```

---

### Step 5 — Implement the `CanAccess` gate component

The component receives `category?` and `action` props. It renders its children
only when `checkPermission` / `checkPermissionAny` returns `true`.

#### React

```tsx
// src/components/CanAccess.tsx
import { type ReactNode } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { checkPermission, checkPermissionAny, rbacConfig } from '@oscardevpr/rbac-core'

interface CanAccessProps {
  action: string
  category?: string
  children: ReactNode
}

export function CanAccess({ action, category, children }: CanAccessProps) {
  const { permissions } = useAuthStore()

  const allowed = category !== undefined
    ? checkPermission(permissions, category, action, rbacConfig.debugMode)
    : checkPermissionAny(permissions, action, rbacConfig.debugMode)

  return allowed ? <>{children}</> : null
}
```

#### Svelte

```svelte
<!-- src/components/CanAccess.svelte -->
<script lang="ts">
  import { get } from 'svelte/store'
  import { permissions } from '../store/authStore'
  import { checkPermission, checkPermissionAny, rbacConfig } from '@oscardevpr/rbac-core'

  export let action: string
  export let category: string | undefined = undefined

  $: allowed = category !== undefined
    ? checkPermission($permissions, category, action, rbacConfig.debugMode)
    : checkPermissionAny($permissions, action, rbacConfig.debugMode)
</script>

{#if allowed}
  <slot />
{/if}
```

---

### Step 6 — Implement the initializer / provider

The adapter must call `setRbacConfig()` and optionally `runSeeder()` at app
startup, just like the Vue plugin does.

```ts
import { setRbacConfig, runSeeder } from '@oscardevpr/rbac-core'
import type { RbacConfigInput, RbacSeedEntry } from '@oscardevpr/rbac-core'

export interface RbacInitOptions extends RbacConfigInput {
  seed?: RbacSeedEntry[]
}

export function initRbac(options: RbacInitOptions): void {
  const { authApiUrl, applicationId, debugMode, loginRoute, seed } = options

  if (!authApiUrl)    throw new Error('[rbac] authApiUrl is required.')
  if (!applicationId) throw new Error('[rbac] applicationId is required.')

  setRbacConfig({ authApiUrl, applicationId, debugMode, loginRoute })

  if (seed?.length) runSeeder(seed)
}
```

For React this is called once in `main.tsx` before `createRoot`. For Svelte in
`+layout.ts` or `app.ts`. For Angular inside `APP_INITIALIZER`.

---

### Step 7 — Create the public entry point

```ts
// src/index.ts

// Initializer
export { initRbac } from './plugin/index'
export type { RbacInitOptions } from './plugin/index'

// Store
export { useAuthStore } from './store/useAuthStore'   // or named exports for Svelte

// Hooks / composables
export { usePermission } from './composables/usePermission'
export { useSessionGuard } from './composables/useSessionGuard'
export { useNavItems } from './composables/useNavItems'
export { useLogout } from './composables/useLogout'
export { useUserDisplay } from './composables/useUserDisplay'

// Gate component
export { CanAccess } from './components/CanAccess'

// Core re-exports (advanced / testing)
export {
  checkPermission,
  checkPermissionAny,
  defineRbacSeed,
  rbacConfig
} from '@oscardevpr/rbac-core'
export type {
  Permission, User, UserType, Application,
  RbacConfig, RbacSeedEntry, ApiError
} from '@oscardevpr/rbac-core'
```

---

### Step 8 — Run `pnpm install` and build

```bash
# From monorepo root — resolves workspace:* links
pnpm install

# Build the core first (adapter depends on it)
pnpm --filter @oscardevpr/rbac-core build

# Build the new adapter
pnpm --filter @oscardevpr/rbac-<framework> build
```

---

## Checklist before finishing

- [ ] `setRbacConfig()` is called before any permission check runs
- [ ] `runSeeder()` is called fire-and-forget (never awaited in boot path)
- [ ] No permission logic is duplicated — all checks go through `checkPermission` / `checkPermissionAny` from `rbac-core`
- [ ] `debugMode: true` returns `true` from every gate without extra code needed
- [ ] `CanAccess` component hides/shows children (not just `display:none`)
- [ ] `usePermission(category?)` optional category mirrors Vue adapter behaviour
- [ ] `pnpm build` passes on both packages with zero TypeScript errors
- [ ] Public API is re-exported cleanly from `src/index.ts`
- [ ] `@oscardevpr/rbac-core` is listed under `dependencies`, not `devDependencies`
- [ ] Framework peer dep (`react`, `svelte`, etc.) is in `peerDependencies`
