# SKILL: Implementar @oscardevpr/rbac-node en un servidor Express

## Objetivo
Integrar la librería `@oscardevpr/rbac-node` en un servidor Express/Node.js existente,
configurando autenticación, auditoría, permisos por ruta y invalidación de cache.

---

## Prerequisitos — verificar antes de empezar

1. El proyecto usa **Express** (>=4.0.0) con TypeScript
2. Existe acceso a la URL de `itr-authenticator` (variable de entorno)
3. Existe un `applicationId` registrado en `itr-authenticator`
4. El servidor tiene `cookie-parser` instalado (el token se lee de la cookie `access_token` por defecto)

---

## Paso 1 — Instalación

### Configurar el registry de GitHub Packages
Crear o editar `.npmrc` en la raíz del proyecto:

```ini
@oscardevpr:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### Instalar el paquete
```bash
pnpm add @oscardevpr/rbac-node
# o
npm install @oscardevpr/rbac-node
```

---

## Paso 2 — Variables de entorno requeridas

Agregar al `.env`:

```dotenv
AUTH_API=http://localhost:8015          # URL de itr-authenticator
APPLICATION_ID=tu_app_id               # ID registrado en itr-authenticator
RBAC_WEBHOOK_SECRET=un_secret_seguro   # Para el webhook de invalidación (recomendado en prod)
```

---

## Paso 3 — Inicializar en el entry point del servidor

Buscar el archivo principal del servidor (generalmente `src/server.ts`, `src/main.ts` o `src/app.ts`).

### Patrón A — Modo per-ruta (RECOMENDADO para APIs nuevas)
1 HTTP call por sesión en lugar de 1 por request.

```ts
import express from 'express'
import cookieParser from 'cookie-parser'
import { createRbacNode, defineRbacSeed, runSeeder } from '@oscardevpr/rbac-node'

const app = express()
app.use(express.json())
app.use(cookieParser())

// 1. Inicializar rbac
const rbac = createRbacNode({
  authApiUrl:     process.env.AUTH_API!,
  applicationId:  process.env.APPLICATION_ID!,
  publicRoutes:   ['/health', '/api-docs'],
  debugMode:      process.env.NODE_ENV !== 'production',
  permissionsTtl: 300,                              // debe coincidir con itr-authenticator
  webhookSecret:  process.env.RBAC_WEBHOOK_SECRET,  // omitir si no se usa webhook
})

// 2. Middlewares globales
app.use(rbac.audit())             // registra acciones en background
app.use(rbac.loadPermissions())   // hidrata req.rbac.permissions (1 HTTP call por sesión)
app.use(rbac.cacheRouter)         // expone POST /rbac/cache/invalidate

// 3. Rutas (DESPUÉS de loadPermissions)
app.use('/api/v1', require('./routes'))

app.listen(3000)
```

### Patrón B — Modo legacy (para APIs ya construidas con muchas rutas)
1 HTTP call por request. Compatible con código existente sin cambios en rutas.

```ts
const rbac = createRbacNode({
  authApiUrl:    process.env.AUTH_API!,
  applicationId: process.env.APPLICATION_ID!,
  publicRoutes:  ['/health', '/api-docs'],
  debugMode:     process.env.NODE_ENV !== 'production',
})

app.use(rbac.audit())
app.use(rbac.guard)   // verifica permisos en cada request
```

---

## Paso 4 — Proteger rutas individuales (solo Patrón A)

En cada router de Express, usar `rbac.can(category, action)` como middleware:

```ts
// employees.router.ts
import { Router } from 'express'
import type { RbacNodeInstance } from '@oscardevpr/rbac-node'

export function employeesRouter(rbac: RbacNodeInstance) {
  const router = Router()

  router.get('/',               rbac.can('Empleados', 'Ver'),              listarHandler)
  router.post('/',              rbac.can('Empleados', 'Agregar empleados'), crearHandler)
  router.put('/:id',            rbac.can('Empleados', 'Editar datos'),      editarHandler)
  router.delete('/:id',         rbac.can('Empleados', 'Eliminar'),          eliminarHandler)
  router.post('/:id/reactivar', rbac.can('Empleados', 'Reactivar'),         reactivarHandler)

  return router
}
```

El string exacto de `category` y `action` debe coincidir con lo registrado en itr-authenticator.

---

## Paso 5 — Seeder (declarar categorías y acciones)

En el entry point, ANTES de montar rutas:

```ts
import { defineRbacSeed, runSeeder } from '@oscardevpr/rbac-node'

const seed = defineRbacSeed({
  Empleados: ['Agregar empleados', 'Editar datos', 'Eliminar', 'Reactivar', 'Ver'],
  Planillas: ['Crear', 'Ver', 'Cerrar planilla', 'Exportar'],
  Reportes:  ['Ver', 'Exportar'],
  Usuarios:  ['Crear', 'Editar', 'Eliminar', 'Ver'],
})

runSeeder(seed)  // fire-and-forget, no bloquea el startup
```

---

## Paso 6 — Session check (opcional)

Solo en routers donde se necesite refresh silencioso del token:

```ts
router.use(rbac.sessionCheck)
```

No montarlo globalmente — solo en rutas donde el usuario esté activamente trabajando.

---

## Paso 7 — Token personalizado (opcional)

Si el token viene en `Authorization: Bearer` en lugar de cookie:

```ts
const rbac = createRbacNode({
  authApiUrl:    process.env.AUTH_API!,
  applicationId: process.env.APPLICATION_ID!,
  tokenExtractor: (req) =>
    req.cookies?.access_token ??
    req.headers.authorization?.replace('Bearer ', ''),
})
```

---

## Paso 8 — Error handler para 401/403

Agregar al final del servidor, después de todas las rutas:

```ts
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status ?? 500
  res.status(status).json({ message: err.message ?? 'Internal Server Error' })
})
```

---

## Acceder a req.rbac en handlers

Con `loadPermissions()` montado, todos los handlers tienen acceso a:

```ts
async function miHandler(req: Request, res: Response) {
  const { userId, permissions } = req.rbac!
  // userId      → string con el ID del usuario autenticado
  // permissions → Permission[] con todos los permisos del usuario
}
```

---

## Invalidación manual de cache

Si desde el código del servidor se cambian permisos de un usuario:

```ts
import { invalidateByUserId } from '@oscardevpr/rbac-node'

await updateUserRoles(userId, newRoles)
invalidateByUserId(userId)  // fuerza re-fetch en el próximo request
```

---

## Checklist final

- [ ] `.npmrc` configurado con `GITHUB_TOKEN`
- [ ] Variables `AUTH_API`, `APPLICATION_ID` en `.env`
- [ ] `cookie-parser` instalado y montado antes de rbac
- [ ] `rbac.audit()` montado primero
- [ ] `rbac.loadPermissions()` montado antes de las rutas protegidas (Patrón A)
- [ ] `rbac.cacheRouter` montado (Patrón A)
- [ ] `rbac.guard` montado (Patrón B)
- [ ] Rutas en `publicRoutes` incluyen `/health` y rutas de docs
- [ ] Error handler al final del servidor
- [ ] Seeder ejecutado en startup

---

## Tipos exportados disponibles

```ts
import type {
  RbacNodeOptions,
  RbacNodeInstance,
  AuditMiddlewareOptions,
  TokenExtractor,
  Permission,
  User,
  UserType,
  Application,
  ApiError,
  RbacSeedEntry,
  RbacSeedMap,
} from '@oscardevpr/rbac-node'
```
