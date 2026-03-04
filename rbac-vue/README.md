# @oscardevpr/rbac-vue

Librería de control de acceso basado en roles (RBAC) para aplicaciones **Vue 3 + Pinia**.

Incluye:
- Cliente HTTP de autenticación
- Store de Pinia para la sesión y permisos
- Composable `usePermission()`
- Directiva `v-can`
- Componente `<CanAccess>`

---

## Instalación

### Desde el workspace (desarrollo local)

```bash
pnpm add @oscardevpr/rbac-vue@workspace:*
```

### Desde GitHub Packages (producción)

Primero configura el registry en tu `.npmrc`:

```
@oscardevpr:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Luego ejecuta este comando para cargar la variable de entorno de github:

# Lee el token de tu archivo .env y lo carga en la sesión actual
```
$token = (Get-Content .env | Select-String "GITHUB_TOKEN").ToString().Split("=")[1].Trim()
$env:GITHUB_TOKEN = $token
```

Luego instala:

```bash
pnpm add @oscardevpr/rbac-vue
```

---

## Configuración inicial

### 1. Registrar el plugin en `main.js`

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { RbacPlugin } from '@oscardevpr/rbac-vue'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())

app.use(RbacPlugin, {
  authApiUrl:    import.meta.env.VITE_AUTH_API_URL,
  applicationId: import.meta.env.VITE_APPLICATION_ID,
  debugMode:     import.meta.env.VITE_APP_MODE === 'debugging', // si true, hasAccess() siempre retorna true
})

app.mount('#app')
```

> **Nota:** `createPinia()` debe instalarse **antes** que `RbacPlugin`.

> **Nota de seguridad:** El seed de categorías y acciones (`POST /rbac/seed`) debe ejecutarse
> **únicamente desde el servidor** usando `@oscardevpr/rbac-node`. Nunca desde el frontend.

### 2. Variables de entorno requeridas

```dotenv
VITE_AUTH_API_URL="http://localhost:5000/api/v1"
VITE_APPLICATION_ID="app_xxxxxxxxxxxxxxxx"
VITE_APP_MODE="production"   # cambiar a "debugging" para saltar validaciones de permisos
```

---

## `usePermission()` — composable principal

Reemplaza directamente al anterior `useAuth()`. El cambio es 1:1.

### Con categoría (uso principal)

```js
import { usePermission } from '@oscardevpr/rbac-vue'

// Antes:
const { hasAccess } = useAuth('Empleados')

// Ahora:
const { hasAccess } = usePermission('Empleados')

// Uso idéntico:
hasAccess('Agregar empleados')   // true | false
hasAccess('Eliminar')
```

### Sin categoría (busca en todas las categorías)

```js
const { hasAccess } = usePermission()

hasAccess('Agregar empleados')  // busca la acción en cualquier categoría
```

### Valores retornados

```js
const {
  hasAccess,       // (action: string) => boolean
  userData,        // Ref — datos del usuario autenticado
  userType,        // Ref — tipo de usuario (rol)
  permissions,     // Ref — arreglo completo de categorías y acciones
  isAuthenticated, // Ref<boolean>
  userEmail,       // Ref<string | null>
  userId           // Ref<string | null>
} = usePermission('MiCategoria')
```

---

## `v-can` — directiva

Oculta el elemento si el usuario no tiene el permiso. Equivalente a `v-if="hasAccess(...)"` pero declarativo.

### Con categoría

```html
<v-btn v-can="{ category: 'Empleados', action: 'Agregar empleados' }">
  Agregar
</v-btn>
```

### Sin categoría

```html
<v-icon v-can="{ action: 'Eliminar' }">
  mdi-delete
</v-icon>
```

> La directiva usa `display: none` para ocultar el elemento — el nodo sigue en el DOM.
> Para eliminarlo completamente usa `<CanAccess>` o `v-if` con `hasAccess()`.

---

## `<CanAccess>` — componente

Renderiza su slot solo si el usuario tiene el permiso. El elemento **no** se monta si no hay acceso.

### Con categoría

```html
<CanAccess category="Planillas" action="Cerrar planilla">
  <v-btn color="error">Cerrar planilla</v-btn>
</CanAccess>
```

### Sin categoría

```html
<CanAccess action="Exportar">
  <export-button />
</CanAccess>
```

### Props

| Prop       | Tipo     | Requerido | Descripción                                               |
|------------|----------|-----------|-----------------------------------------------------------|
| `action`   | `String` | ✅        | Nombre de la acción a verificar                            |
| `category` | `String` | ❌        | Categoría en la que buscar. Si se omite, busca en todas.  |

---

## `useAuthStore` — store de Pinia

Accesible directamente si necesitas más control sobre la sesión.

```js
import { useAuthStore } from '@oscardevpr/rbac-vue'

const authStore = useAuthStore()

// Verificar sesión y cargar permisos
await authStore.checkAuth()

// Login con credenciales
await authStore.loginWithCredentials({ email, password })

// Login con token SSO
await authStore.loginByCoreToken(token)

// Cerrar sesión
await authStore.logOut()

// Consultar acciones de una categoría directamente
const acciones = authStore.getActionsByCategory('Empleados')
// ['Agregar empleados', 'Editar datos de empleado', ...]

// Estado
authStore.isAuthenticated  // boolean
authStore.userData         // objeto del usuario
authStore.userType         // tipo/rol del usuario
authStore.permissions      // [{ category, actions[] }]
authStore.userEmail        // string | null
authStore.userId           // string | null
```

### Flujo de carga de permisos

```
checkAuth()
  → GET /user-sessions/verify-session         // verifica sesión activa
  → loadPermissions(userId)
      → GET /users/{id}/application/{appId}/get-user-type-actions
          // guarda: userType, application, permissions[]
```

---

## Flujo completo de autenticación

```
app.use(RbacPlugin, options)
        │
        ├── setRbacConfig(authApiUrl, applicationId, debugMode)
        ├── app.directive('can', vCan)
        └── app.component('CanAccess', CanAccess)

(usuario navega a una ruta protegida)
        │
        └── router guard → authStore.checkAuth()
              │
              ├── GET /user-sessions/verify-session
              └── GET /users/{id}/application/{appId}/get-user-type-actions
                    │
                    └── permissions[] cargados en el store
                          │
                          └── usePermission('Empleados').hasAccess('Agregar empleados')  ✓
```

---

## debugMode

Cuando `debugMode: true`, **todas** las llamadas a `hasAccess()`, `v-can` y `<CanAccess>` retornan `true` sin importar los permisos reales. Útil para desarrollo sin un backend de auth levantado.

```dotenv
# .env.development
VITE_APP_MODE="debugging"
```

---

## Estructura del paquete

```
src/
  composables/
    usePermission.js     Composable principal
  directives/
    vCan.js              Directiva v-can
  components/
    CanAccess.vue        Componente wrapper con slot
  plugin/
    index.js             Vue plugin: RbacPlugin
  index.js               Barrel de exports públicos
```

---

## Exports públicos

```js
import {
  RbacPlugin,          // Vue plugin principal
  usePermission,       // Composable
  useAuthStore,        // Pinia store
  vCan,                // Directiva (para registro manual local)
  CanAccess,           // Componente (para registro manual local)
  checkPermission,     // Motor de permisos — scoped (uso avanzado / tests)
  checkPermissionAny   // Motor de permisos — any category (uso avanzado / tests)
} from '@oscardevpr/rbac-vue'
```

---

## Build

```bash
pnpm build     # genera dist/rbac-vue.js (ESM) y dist/rbac-vue.umd.cjs (UMD)
pnpm dev       # watch mode
pnpm test      # unit tests (vitest)
```

---

## Publicar una nueva versión

1. Incrementar la versión en `package.json` siguiendo [Semantic Versioning](https://semver.org/):
   - `PATCH` (1.0.**x**) — bug fixes, parches de seguridad
   - `MINOR` (1.**x**.0) — nuevas funciones sin breaking changes
   - `MAJOR` (**x**.0.0) — breaking changes

2. Build y publicar:
   ```bash
   pnpm build
   pnpm publish
   ```

3. En los proyectos consumidores:
   ```bash
   pnpm update @oscardevpr/rbac-vue
   ```
