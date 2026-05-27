# @oscardevpr/rbac-core

Motor de RBAC **agnóstico de framework** para el ecosistema `itr-authenticator`.

Proporciona el singleton de configuración, el motor de permisos, la capa HTTP de autenticación y el seeder declarativo. Es la **dependencia base** de `@oscardevpr/rbac-node` y `@oscardevpr/rbac-vue`.

---

## Instalación

### Desde GitHub Packages

1. Crea / edita el archivo `.npmrc` en la raíz de tu proyecto:

```ini
@oscardevpr:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

2. Carga tu token (PowerShell):

```powershell
# opción A — leer de .env
$env:GITHUB_TOKEN = (Get-Content .env | Select-String "GITHUB_TOKEN").ToString().Split("=")[1].Trim()

# opción B — pegar el token directamente (solo en sesión local, no en CI)
$env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxx"
```

3. Instala el paquete:

```bash
npm install @oscardevpr/rbac-core
# o con pnpm
pnpm add @oscardevpr/rbac-core
```

### Desde el workspace (monorepo local)

```bash
pnpm add @oscardevpr/rbac-core@workspace:*
```

---

## Uso rápido

### 1. Configurar el singleton

```ts
import { setRbacConfig } from '@oscardevpr/rbac-core'

setRbacConfig(
  process.env.AUTH_API_URL,    // URL base de itr-authenticator
  process.env.APPLICATION_ID,  // ID de la app registrada
  false,                       // true → checkPermission() siempre retorna true
  'login'                      // solo necesario en @oscardevpr/rbac-vue
)
```

> `setRbacConfig` escribe en el singleton de módulo. Llámalo **una sola vez** al inicio de la app.

### 2. Motor de permisos

```ts
import { checkPermission, checkPermissionAny } from '@oscardevpr/rbac-core'

const permissions = [
  { category: 'Empleados', actions: ['Agregar empleados', 'Eliminar'] },
  { category: 'Planillas',  actions: ['Crear', 'Ver'] },
]

// Busca la acción dentro de una categoría específica
checkPermission(permissions, 'Empleados', 'Agregar empleados') // true
checkPermission(permissions, 'Empleados', 'Exportar')          // false

// Busca la acción en CUALQUIER categoría
checkPermissionAny(permissions, 'Crear') // true
```

### 3. Capa HTTP

```ts
import {
  logInWithCredentials,
  logInByCoreToken,
  getAuthenticatedUserData,
  getUserTypeAndActions,
  signOut,
} from '@oscardevpr/rbac-core'

// Login con usuario + contraseña
const loginResult = await logInWithCredentials(user_name, password)

// Verificar sesión activa
const session = await getAuthenticatedUserData()
// session.user → { id, email, first_name, last_name, ... }

// Cargar permisos del usuario
const data = await getUserTypeAndActions(session.user.id)
// data.permissions → [{ category, actions[] }]
// data.userType    → { id, name }
// data.application → { id, name }

// Cerrar sesión
await signOut()
```

### 4. Seeder declarativo

Declara las categorías y acciones de tu aplicación. Al iniciar, el backend crea las entradas faltantes (**upsert**).

```ts
import { defineRbacSeed, runSeeder } from '@oscardevpr/rbac-core'

const seed = defineRbacSeed({
  Empleados: ['Agregar empleados', 'Editar datos', 'Eliminar', 'Reactivar'],
  Planillas: ['Crear', 'Ver', 'Cerrar planilla'],
  Reportes:  ['Ver', 'Exportar'],
})

// Envía POST /rbac/seed — fire-and-forget, nunca bloquea la app
runSeeder(seed)
```

**Endpoint esperado en el backend:**

```
POST /rbac/seed
Content-Type: application/json

{
  "categories": [
    { "name": "Empleados", "actions": ["Agregar empleados", "Editar datos", ...] }
  ]
}
```

---

## API completa

### `setRbacConfig(authApiUrl, applicationId, debugMode?, loginRoute?)`

| Parámetro       | Tipo                      | Requerido | Default    | Descripción                                      |
|-----------------|---------------------------|-----------|------------|--------------------------------------------------|
| `authApiUrl`    | `string`                  | ✅        | —          | URL base de itr-authenticator                    |
| `applicationId` | `string \| number`        | ✅        | —          | ID de la aplicación                              |
| `debugMode`     | `boolean`                 | ❌        | `false`    | Si `true`, `checkPermission` siempre es `true`   |
| `loginRoute`    | `string`                  | ❌        | `'login'`  | Nombre de ruta para redirigir al login. **Solo lo usa `@oscardevpr/rbac-vue`** (`useSessionGuard`, `useLogout`). Ignorado en Node.js. |

### `checkPermission(permissions, category, action)`

Retorna `true` si `action` existe dentro de la `category` dada.

### `checkPermissionAny(permissions, action)`

Retorna `true` si `action` existe en **cualquier** categoría.

### `createAuthApi()`

Factory que devuelve una instancia de `axios` preconfigurada con `authApiUrl` como `baseURL`. Útil para llamadas HTTP custom.

### HTTP helpers

| Función                          | Descripción                                              |
|----------------------------------|----------------------------------------------------------|
| `logInWithCredentials(user_name, password)` | `POST /auth/login` con usuario y password        |
| `logInByCoreToken(token)`                 | Login mediante token SSO externo                 |
| `getAuthenticatedUserData()`     | `GET /user-sessions/verify-session`                      |
| `getUserTypeAndActions(userId)`  | `GET /users/:id/application/:appId/get-user-type-actions`|
| `signOut()`                      | `POST /auth/logout`                                      |

---

## Tipos exportados

```ts
import type {
  Permission,             // { category: string; actions: string[] }
  User,                   // { id, email, first_name, last_name, ... }
  UserType,               // { id, name }
  Application,            // { id, name }
  RbacConfig,             // Forma del singleton completo
  RbacSeedEntry,          // { name: string; actions: string[] }
  RbacSeedMap,            // Record<string, string[]>
  SessionResponse,        // { user: User }
  UserTypeActionsResponse,// { userType, permissions[], application }
  LoginResponse,          // { message, user }
  LogoutResponse,         // { message }
  ApiError,               // { status?, message, originalError? }
} from '@oscardevpr/rbac-core'
```

---

## Build

```bash
pnpm build   # Genera dist/rbac-core.js (ESM) + dist/rbac-core.umd.cjs (UMD)
pnpm dev     # Watch mode
```

---

## Publicar nueva versión

1. Bumpa la versión en `package.json` (semver).
2. Haz build y publica:

```bash
pnpm build
pnpm publish
```

El paquete se publica automáticamente en GitHub Packages si haces push de un tag `v*` en el repositorio.
