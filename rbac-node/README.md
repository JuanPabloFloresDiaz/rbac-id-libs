# @oscardevpr/rbac-node

Middlewares de autenticación y RBAC para **Express / Node.js** basados en `itr-authenticator`.

Incluye:
- `guard` — verifica permisos en cada request contra el servicio de auth *(modo legacy)*
- `audit()` — registra todas las acciones (fire-and-forget, no bloquea)
- `sessionCheck` — refresca el token silenciosamente si está próximo a expirar
- `loadPermissions()` — hidrata `req.rbac.permissions` una sola vez por sesión *(modo per-ruta)*
- `can(category, action)` — factory síncrona de middleware por ruta, 0 llamadas HTTP
- `cacheRouter` — router con webhook `POST /rbac/cache/invalidate`

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

# opción B — pegar el token directamente
$env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxx"
```

3. Instala el paquete:

```bash
npm install @oscardevpr/rbac-node
# o con pnpm
pnpm add @oscardevpr/rbac-node
```

> **Nota:** `@oscardevpr/rbac-core` se instala automáticamente como dependencia.

### Desde el workspace (monorepo local)

```bash
pnpm add @oscardevpr/rbac-node@workspace:*
```

---

## Uso rápido

```ts
// server.ts
import express from 'express'
import { createRbacNode } from '@oscardevpr/rbac-node'

const app = express()

const rbac = createRbacNode(
  process.env.AUTH_API,         // URL de itr-authenticator (requerido)
  process.env.APPLICATION_ID,   // ID de la app registrada (requerido)
  ['/health', '/api-docs'],                      // rutas que saltan el guard
  3000,                                          // timeout en ms para llamadas al auth service
  process.env.NODE_ENV !== 'production'
)

// Auditoría — registra todas las acciones en background
app.use(rbac.audit())

// Guard — bloquea requests sin permisos (retorna 401/403)
app.use(rbac.guard)

// SessionCheck — en rutas donde quieras refresh silencioso de token
app.use('/api', rbac.sessionCheck)

app.listen(3000)
```

---

## `createRbacNode(authApiUrl, applicationId, publicRoutes?, timeout?, debugMode?, tokenExtractor?, logger?, permissionsTtl?, webhookSecret?)`

`authApiUrl` y `applicationId` son **requeridos** y se pasan como parámetros posicionales.
Para omitir un parámetro opcional intermedio usa `undefined`.

| Parámetro         | Tipo                | Requerido | Default                | Descripción                                              |
|-------------------|---------------------|-----------|------------------------|----------------------------------------------------------|
| `authApiUrl`      | `string`            | ✅        | —                      | URL base del auth service                               |
| `applicationId`   | `string \| number`  | ✅        | —                      | ID de la app registrada                                 |
| `publicRoutes`    | `string[]`          | ❌        | `['/health']`          | Rutas que saltan `guard`, `sessionCheck` y `loadPermissions` |
| `timeout`         | `number`            | ❌        | `3000`                 | Timeout en ms para llamadas HTTP al auth service         |
| `debugMode`       | `boolean`           | ❌        | `false`                | Si `true`, todos los middlewares llaman `next()` directo |
| `tokenExtractor`  | `TokenExtractor`    | ❌        | cookie `access_token`  | Función para extraer el JWT de la request                |
| `logger`          | `object`            | ❌        | `console`              | Logger propio (winston, pino, etc.)                      |
| `permissionsTtl`  | `number`            | ❌        | `300`                  | TTL en segundos del cache de permisos de `loadPermissions` — debe coincidir con el TTL de itr-authenticator |
| `webhookSecret`   | `string`            | ❌        | —                      | Secret compartido para autenticar `POST /rbac/cache/invalidate` |

---

## Modos de operación

| Modo | Cuándo usarlo | Llamadas HTTP por request |
|------|--------------|---------------------------|
| **Legacy** (`guard`) | APIs ya construidas (80+ rutas), migración gradual | 1 por request |
| **Per-ruta** (`loadPermissions` + `can`) | Nuevas APIs o cuando el rendimiento importa | 1 por sesión (cache) |

Ambos modos coexisten — puedes combinarlos en el mismo servidor.

---

## Modo per-ruta (recomendado para nuevas APIs)

### Setup

```ts
const rbac = createRbacNode(
  process.env.AUTH_API,
  process.env.APPLICATION_ID,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  300, // debe coincidir con PermissionCacheService en itr-authenticator
  process.env.RBAC_WEBHOOK_SECRET // opcional pero recomendado en producción
)

app.use(rbac.audit())
app.use(rbac.loadPermissions())   // 1 HTTP call por sesión → llena req.rbac.permissions
app.use(rbac.cacheRouter)         // expone POST /rbac/cache/invalidate

router.get('/empleados',          rbac.can('Empleados', 'Ver'),              listarHandler)
router.post('/empleados',         rbac.can('Empleados', 'Agregar empleados'), crearHandler)
router.delete('/empleados/:id',   rbac.can('Empleados', 'Eliminar'),          eliminarHandler)
```

---

## `rbac.loadPermissions()` — hidratación de permisos

Global middleware que resuelve `req.rbac.permissions` antes de que lleguen a los handlers:

- **Cache HIT** (token ya visto) → 0 llamadas HTTP, resolución desde memoria.
- **Cache MISS** (primera request del usuario) → 1 llamada a `GET {authApiUrl}/api/v1/permissions/my-permissions?appKey=<applicationId>`.

El token del usuario se almacena como **hash SHA-256** — nunca en texto plano.

```ts
app.use(rbac.loadPermissions())
// A partir de aquí, en todos los handlers:
// req.rbac.userId       → string
// req.rbac.permissions  → Permission[]
```

> Requiere el endpoint `GET /api/v1/permissions/my-permissions` en itr-authenticator (v2+).

---

## `rbac.can(category, action)` — guard por ruta

Factory **pura y síncrona** — 0 llamadas HTTP. Usa los permisos ya cargados en `req.rbac.permissions`.

```ts
router.get('/empleados',              rbac.can('Empleados', 'Ver'),              handler)
router.post('/empleados',             rbac.can('Empleados', 'Agregar empleados'), handler)
router.delete('/empleados/:id',       rbac.can('Empleados', 'Eliminar'),          handler)
router.get('/reportes',               rbac.can('Reportes',  'Ver'),              handler)
router.post('/reportes/exportar',     rbac.can('Reportes',  'Exportar'),          handler)
```

Cuando el usuario no tiene el permiso retorna `403 Permission denied`. Si `loadPermissions()` no fue montado antes retorna `500` con un mensaje de configuración.

---

## `rbac.cacheRouter` — invalidación de cache por webhook

itr-authenticator notifica a tu servidor cuando los permisos de un usuario cambian, forzando el re-fetch en el próximo request.

### Setup en el servidor

```ts
app.use(rbac.cacheRouter)  // registra POST /rbac/cache/invalidate
```

### Payload del webhook (enviado por itr-authenticator)

```json
{ "userId": "abc123" }
```

### Seguridad

Cuando `webhookSecret` está definido, el endpoint exige el header:

```
x-rbac-secret: <webhookSecret>
```

Requests sin el header o con secret incorrecto reciben `401`.

### Exportación directa

Puedes invalidar manualmente desde tu propio código:

```ts
import { invalidateByUserId } from '@oscardevpr/rbac-node'

// Ej: al editar roles desde el panel admin
await updateUserRoles(userId, newRoles)
invalidateByUserId(userId)
```

---

## `rbac.guard` — middleware de autorización (modo legacy)

Valida cada request contra `POST {authApiUrl}/api/v1/permissions/check`.

- Si el endpoint retorna **200** → llama `next()`.
- Si retorna **401 / 403** → pasa el error al handler de Express (`next(error)`).
- Rutas en `publicRoutes` y `debugMode: true` siempre pasan.

```ts
app.use(rbac.guard)
```

El endpoint de verificación recibe:

```json
{
  "appKey": "<applicationId>",
  "method": "POST",
  "path": "/api/empleados"
}
```

---

## `rbac.audit(exclude?, sensitiveFields?)` — middleware de auditoría

Registra cada request de forma asíncrona (**fire-and-forget**). Nunca bloquea ni falla la request principal.

```ts
app.use(rbac.audit(
  ['/health', '/metrics'],  // rutas que no se auditan
  ['password', 'pin']       // campos extra a ocultar del body
))
```

Los campos sensibles predeterminados ocultados son:
`password`, `token`, `access_token`, `refresh_token`, `secret`, `cvv`, `pin`.

---

## `rbac.sessionCheck` — middleware de refresco de sesión

Solicita un refresco silencioso del token al servicio de auth. Aplica solo en las rutas donde sea conveniente (generalmente el router principal de la API).

```ts
app.use('/api', rbac.sessionCheck)
```

---

## `tokenExtractor` personalizado

Por defecto el token se lee de la **cookie** `access_token`. Para soportar también `Authorization: Bearer`:

```ts
const rbac = createRbacNode(
  process.env.AUTH_API,
  process.env.APPLICATION_ID,
  undefined,
  undefined,
  undefined,
  (req) =>
    req.cookies?.access_token ??
    req.headers.authorization?.replace('Bearer ', '')
)
```

---

## Re-exports de `@oscardevpr/rbac-core`

Para no tener que instalar `rbac-core` por separado en el servidor, `rbac-node` re-exporta los tipos más comunes y el seeder:

```ts
import type { Permission, User, UserType, Application, ApiError } from '@oscardevpr/rbac-node'

// Seeder — declarar categorías y acciones en el servidor
import { defineRbacSeed, runSeeder } from '@oscardevpr/rbac-node'
```

---

## Seeder declarativo

El seeder debe ejecutarse **únicamente desde el servidor**. Llama a `POST /rbac/seed` para que el backend cree las entradas faltantes en la DB (**upsert**). Es fire-and-forget — nunca bloquea el arranque del servidor.

```ts
// server.ts
import { createRbacNode, defineRbacSeed, runSeeder } from '@oscardevpr/rbac-node'

const seed = defineRbacSeed({
  Empleados: ['Agregar empleados', 'Editar datos', 'Eliminar', 'Reactivar'],
  Planillas: ['Crear', 'Ver', 'Cerrar planilla'],
  Reportes:  ['Ver', 'Exportar'],
})

// Ejecutar al iniciar el servidor — antes de montar rutas
runSeeder(seed)

const rbac = createRbacNode(authApiUrl, applicationId)
app.use(rbac.audit())
app.use(rbac.guard)
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

## Tipos exportados

```ts
import type {
  RbacNodeInstance,       // Tipo retornado por createRbacNode()
  TokenExtractor,         // (req: Request) => string | undefined
  Permission,
  User,
  UserType,
  Application,
  ApiError,
  RbacSeedEntry,          // { name: string; actions: string[] }
  RbacSeedMap,            // Record<string, string[]>
} from '@oscardevpr/rbac-node'
```

### Augmentación de `Express.Request`

`loadPermissions()` extiende automáticamente `Express.Request` con:

```ts
interface Request {
  rbac?: {
    userId:      string
    permissions: Permission[]
  }
}
```

No se necesita configuración adicional — se activa al instalar el paquete.

---

## Variables de entorno sugeridas

```dotenv
AUTH_API=http://localhost:8015
APPLICATION_ID=app_xxxxxxxxxxxx
NODE_ENV=production
```

---

## Build

```bash
pnpm build   # Genera dist/rbac-node.js (ESM) + dist/rbac-node.umd.cjs (UMD)
pnpm dev     # Watch mode
```

---

## Publicar nueva versión

1. Bumpa la versión en `package.json` (semver).
2. Build y publica:

```bash
pnpm build
pnpm publish
```

El paquete se publica automáticamente en GitHub Packages al hacer push de un tag `v*`.

---

## Dependencias

| Paquete                    | Rol                        |
|----------------------------|----------------------------|
| `@oscardevpr/rbac-core`    | Motor RBAC y capa HTTP     |
| `axios`                    | Cliente HTTP               |
| `express` *(peerDep)*      | Framework (>=4.0.0)        |
