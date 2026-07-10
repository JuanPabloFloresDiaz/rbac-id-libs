---
name: skill-rbac-vue
description: "Instala y configura @oscardevpr/rbac-vue en Vue 3 + Pinia. Incluye RbacPlugin, usePermission, v-can y CanAccess."
argument-hint: "Indica tu main.ts y si necesitas ejemplos con usePermission, v-can, CanAccess, useSessionGuard o useLogout."
keywords: [rbac, vue, pinia, permissions, auth, composable, directive, plugin]
---

# Implementar @oscardevpr/rbac-vue en Vue 3

## Cuando usar
- App Vue 3 con control de acceso por roles.
- Necesitas plugin, directiva y composables listos para usar.
- No usar este paquete en backend — usar `@oscardevpr/rbac-node` para Express.

## Entradas requeridas
- `VITE_AUTH_API_URL` (URL base de itr-authenticator, ej: `http://localhost:5000/api/v1`).
- `VITE_APPLICATION_ID` (ID de app registrada en itr-authenticator).
- `VITE_APP_MODE` (`"production"` o `"debugging"`).

## Dependencias previas
- `pinia` instalado y `createPinia()` registrado ANTES de `RbacPlugin`.
- `vue-router` instalado si usas `useSessionGuard` o `useLogout`.

## Procedimiento

1) Instalar el paquete.

```bash
pnpm add @oscardevpr/rbac-vue
```

2) Definir variables de entorno.

```dotenv
VITE_AUTH_API_URL="http://localhost:5000/api/v1"
VITE_APPLICATION_ID="app_xxxxx"
VITE_APP_MODE="production"
```

3) Registrar el plugin en main.ts.

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { RbacPlugin } from '@oscardevpr/rbac-vue'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())          // Pinia ANTES del plugin
app.use(
  RbacPlugin,
  import.meta.env.VITE_AUTH_API_URL,
  import.meta.env.VITE_APPLICATION_ID,
  import.meta.env.VITE_APP_MODE === 'debugging'  // debugMode
)

app.mount('#app')
```

4) Usar permisos en componentes.

```ts
import { usePermission } from '@oscardevpr/rbac-vue'

// Con categoria (scope a un modulo)
const { hasAccess } = usePermission('Empleados')
hasAccess('Agregar empleados')  // boolean

// Sin categoria (busca en todos los modulos)
const { hasAccess: hasAny } = usePermission()
hasAny('Agregar empleados')
```

```html
<!-- Directiva: oculta con display:none si sin permiso -->
<button v-can="{ category: 'Empleados', action: 'Agregar empleados' }">Agregar</button>

<!-- Componente: no monta el slot si sin permiso -->
<CanAccess category="Planillas" action="Cerrar planilla">
  <button>Cerrar</button>
</CanAccess>
```

5) Proteger la sesion en App.vue o en un layout.

```ts
import { useSessionGuard } from '@oscardevpr/rbac-vue'

// Redirige a loginRoute si la sesion no es valida
useSessionGuard(undefined, (err) => console.error(err))
```

6) Usar `useAuthStore` para control avanzado de sesion.

```ts
import { useAuthStore } from '@oscardevpr/rbac-vue'

const authStore = useAuthStore()
await authStore.checkAuth()                           // verifica sesion y carga permisos
await authStore.loginWithCredentials(user_name, password)
await authStore.loginByCoreToken(coreToken)
await authStore.logOut()
authStore.getActionsByCategory('Empleados')           // string[]
```

## Firmas de funciones

```ts
// Plugin
RbacPlugin.install(
  app: App,
  authApiUrl: string,
  applicationId: string | number,
  debugMode?: boolean,     // default: false
  loginRoute?: string      // default: 'login'
): void

// Composable principal
usePermission(category?: string): {
  hasAccess: (action: string) => boolean
  userData: Ref<User | null>
  userType: Ref<UserType | null>
  permissions: Ref<Permission[]>
  isAuthenticated: Ref<boolean>
  userEmail: Ref<string | null>
  userId: Ref<string | number | null>
}

// Guard de sesion
useSessionGuard(
  redirectTo?: string,          // default: rbacConfig.loginRoute ?? 'login'
  onError?: (err: unknown) => void
): { verifySession: () => Promise<void> }

// Logout con redirect
useLogout(
  redirectTo?: string,
  onSuccess?: (data: unknown) => void,
  onError?: (err: ApiError) => void
): { logOut: () => Promise<void> }

// Directiva
v-can="{ category: string, action: string }"
// Efecto: aplica display:none si el usuario no tiene el permiso

// Componente
<CanAccess category="string" action="string">slot</CanAccess>
// Efecto: no monta el slot si el usuario no tiene el permiso

// Store (useAuthStore)
state: { isAuthenticated: boolean, userData: User | null, userType: UserType | null,
         application: Application | null, permissions: Permission[] }
getters: { userEmail: string | null, userId: string | number | null }
actions: {
  checkAuth(): Promise<SessionResponse>
  loadPermissions(userId: string | number): Promise<void>
  loginWithCredentials(user_name: string, password: string): Promise<LoginResponse>
  loginByCoreToken(coreToken: string): Promise<LoginResponse>
  logOut(): Promise<LogoutResponse>
  getActionsByCategory(category: string): string[]
  setUser(user: User): void
  setUserType(userType: UserType): void
  setPermissions(permissions: Permission[]): void
}
```

## Reactividad
- `usePermission()` retorna `Ref` para `userData`, `permissions`, `isAuthenticated` — son reactivos automaticamente via Pinia `storeToRefs`.
- `hasAccess()` es una funcion plain — el template la llama directamente y Vue la re-evalua porque depende de `permissions` (que si es reactivo).
- `v-can` re-evalua cuando cambia el store de permisos.
- `CanAccess` no monta el slot (no es `display:none`) — diferencia clave con `v-can`.

## Condiciones de error
- `RbacPlugin` llama `console.error(...)` y retorna sin lanzar si `authApiUrl` es falsy.
- `RbacPlugin` llama `console.error(...)` y retorna sin lanzar si `applicationId` es falsy.
- `useSessionGuard` redirige a `loginRoute` cuando `checkAuth()` falla (sesion invalida).
- `useSessionGuard` NO redirige si `debugMode: true` — permite trabajar sin sesion en desarrollo.
- `useLogout` redirige siempre aunque el logout falle con 403 (sesion expirada).
- `debugMode: true` hace que `hasAccess()` siempre retorne `true` (bypass de desarrollo).
- `runSeeder` NUNCA debe llamarse desde el frontend — solo en backend.

## Casos de uso
- Ocultar elementos UI con `v-can`.
- Bloquear render de secciones con `CanAccess`.
- Logica condicional TypeScript-safe con `usePermission`.
- Proteger toda la app con `useSessionGuard` en `App.vue`.
- SSO desde otra app con `loginByCoreToken`.

## Checks de calidad
- `createPinia()` registrado ANTES de `RbacPlugin` en main.ts.
- `debugMode` es `false` en produccion (leer de `VITE_APP_MODE`).
- Nunca llamar `runSeeder` desde el frontend.
- `vue-router` instalado si usas `useSessionGuard` o `useLogout`.

## Referencias
- [Referencia rbac-vue](./references/rbac-vue.md)
