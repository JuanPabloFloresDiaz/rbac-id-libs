---
name: skill-{NOMBRE}
description: "Instala y configura {SCOPE}/{NOMBRE} en Express: {MIDDLEWARES_PRINCIPALES}."
argument-hint: "Indica tu entry point Express y si quieres Patron A (per-ruta) o Patron B (legacy)."
keywords: [{KEYWORD_1}, express, middleware, {KEYWORD_3}]
---

# Implementar {SCOPE}/{NOMBRE} en Express

## Cuando usar
- Backend Express con {CASO_PRINCIPAL}.
- {CASO_SECUNDARIO}.
- Migracion gradual (modo legacy) o integracion nueva (modo per-ruta).

## Entradas requeridas
- `{ENV_AUTH_API}` (URL base del servicio de autenticacion).
- `{ENV_APP_ID}` (ID de la aplicacion registrada).
- `{ENV_SECRET}` (opcional pero recomendado en produccion).

## Dependencias previas
- `cookie-parser` instalado y montado antes del factory.
- `express.json()` montado antes del factory.

## Orden de montaje

El orden de los middlewares es obligatorio. Un orden incorrecto produce errores silenciosos o 401/403 incorrectos.

```
express.json()
cookie-parser
rbac.audit()          ← siempre primero entre los middlewares rbac
rbac.loadPermissions() ← antes de cualquier ruta protegida (solo Patron A)
rbac.cacheRouter       ← antes de rutas de negocio
─── rutas de negocio ─────────────────────────────────────────────
  router.use(rbac.can('Categoria', 'Accion'))  ← por ruta (Patron A)
  router.use(rbac.guard)                       ← global (Patron B)
  router.use(rbac.sessionCheck)                ← solo donde necesites silent refresh
```

## Procedimiento

1) Instalar el paquete.

```bash
pnpm add {SCOPE}/{NOMBRE}
# o
npm install {SCOPE}/{NOMBRE}
```

2) Definir variables de entorno.

```dotenv
{ENV_AUTH_API}=http://localhost:{PUERTO}
{ENV_APP_ID}=tu_app_id
{ENV_SECRET}=un_secret_seguro
```

3) Elegir modo de integracion.

### Patron A (per-ruta, recomendado)

```ts
import express from 'express'
import cookieParser from 'cookie-parser'
import { {FACTORY_FN} } from '{SCOPE}/{NOMBRE}'

const app = express()
app.use(express.json())
app.use(cookieParser())

const rbac = {FACTORY_FN}(
  process.env.{ENV_AUTH_API}!,
  process.env.{ENV_APP_ID}!,
  ['/health', '/api-docs'],  // publicRoutes
  3000,                       // timeout ms
  process.env.NODE_ENV !== 'production', // debugMode
  undefined,                  // tokenExtractor (default: cookie)
  undefined,                  // logger (default: console)
  300,                        // permissionsTtl segundos
  process.env.{ENV_SECRET}
)

app.use(rbac.audit())
app.use(rbac.loadPermissions())
app.use(rbac.cacheRouter)

app.use('/api/v1', routes)
```

### Patron B (legacy — 1 llamada HTTP por request)

```ts
const rbac = {FACTORY_FN}(
  process.env.{ENV_AUTH_API}!,
  process.env.{ENV_APP_ID}!
)

app.use(rbac.audit())
app.use(rbac.guard)
```

4) Proteger rutas individuales (solo Patron A).

```ts
router.get('/recursos',       rbac.can('{CATEGORIA}', '{ACCION_VER}'),     handler)
router.post('/recursos',      rbac.can('{CATEGORIA}', '{ACCION_CREAR}'),   handler)
router.delete('/recursos/:id', rbac.can('{CATEGORIA}', '{ACCION_ELIMINAR}'), handler)
```

5) Usar session check solo donde necesites silent token refresh.

```ts
router.use(rbac.sessionCheck)
```

6) Invalidar cache cuando cambien permisos de un usuario.

```ts
import { {FN_INVALIDATE} } from '{SCOPE}/{NOMBRE}'

await updateUserRoles(userId, newRoles)
{FN_INVALIDATE}(userId)
```

## Firmas de funciones

```ts
// Factory principal
{FIRMA_FACTORY}
// Throws: Error('[{NOMBRE}] authApiUrl es requerido...') si authApiUrl es falsy
// Throws: Error('[{NOMBRE}] applicationId es requerido...') si applicationId es falsy

// Middlewares retornados (RbacNodeInstance)
guard: RequestHandler
audit(exclude?: string[], sensitiveFields?: string[]): RequestHandler
sessionCheck: RequestHandler
loadPermissions(): RequestHandler
can(category: string, action: string): RequestHandler
cacheRouter: Router

// Utilidades exportadas
{FN_INVALIDATE}(userId: string | number): void
```

## Condiciones de error
- `{FACTORY_FN}` lanza `Error('{MSG_AUTH_API}')` cuando `authApiUrl` es `undefined` o `''`.
- `{FACTORY_FN}` lanza `Error('{MSG_APP_ID}')` cuando `applicationId` es `undefined` o `0`.
- `rbac.can()` retorna 403 si `req.rbac.permissions` no contiene la categoria+accion.
- `rbac.can()` retorna 401 si `loadPermissions()` no fue montado antes (req.rbac es undefined).
- `rbac.audit()` nunca bloquea — falla silenciosa si el servicio de audit logs no responde.

## Casos de uso
- APIs nuevas: `loadPermissions()` + `can()` por ruta (Patron A).
- Migracion gradual: usar `guard` global mientras se migra ruta por ruta.
- Invalidacion de cache por webhook desde el servicio de autenticacion.

## Checks de calidad
- `cookie-parser` instalado y montado ANTES de `{FACTORY_FN}`.
- `rbac.audit()` es el PRIMER middleware rbac en montarse.
- `rbac.loadPermissions()` montado ANTES de las rutas protegidas.
- `{ENV_SECRET}` configurado identico en este servidor y en el servicio de autenticacion.
- `debugMode` es `false` en produccion.

## Referencias
- [Referencia {NOMBRE}](./references/{NOMBRE}.md)
