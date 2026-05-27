---
name: skill-rbac-node
description: "Instala y configura @oscardevpr/rbac-node en Express: guard, audit, loadPermissions, can por ruta, cacheRouter y seeder."
argument-hint: "Indica tu entry point y si quieres Patron A (per-ruta) o Patron B (legacy)."
---

# Implementar @oscardevpr/rbac-node en Express

## Cuando usar
- Backend Express con control de acceso basado en permisos.
- Necesitas auditoria y cache de permisos.
- Migracion gradual (modo legacy) o API nueva (modo per-ruta).

## Entradas requeridas
- `AUTH_API` (URL base de itr-authenticator).
- `APPLICATION_ID` (ID de app).
- `RBAC_WEBHOOK_SECRET` (opcional pero recomendado en prod).

## Procedimiento

1) Instalar el paquete.

```bash
pnpm add @oscardevpr/rbac-node
# o
npm install @oscardevpr/rbac-node
```

2) Definir variables de entorno.

```dotenv
AUTH_API=http://localhost:8015
APPLICATION_ID=tu_app_id
RBAC_WEBHOOK_SECRET=un_secret_seguro
```

3) Elegir modo de integracion.

### Patron A (per-ruta, recomendado)

```ts
import express from 'express'
import cookieParser from 'cookie-parser'
import { createRbacNode, defineRbacSeed, runSeeder } from '@oscardevpr/rbac-node'

const app = express()
app.use(express.json())
app.use(cookieParser())

const seed = defineRbacSeed({
  Empleados: ['Agregar empleados', 'Editar datos', 'Eliminar', 'Ver'],
})
runSeeder(seed)

const rbac = createRbacNode(
  process.env.AUTH_API!,
  process.env.APPLICATION_ID!,
  ['/health', '/api-docs'],
  3000,
  process.env.NODE_ENV !== 'production',
  undefined,
  undefined,
  300,
  process.env.RBAC_WEBHOOK_SECRET
)

app.use(rbac.audit())
app.use(rbac.loadPermissions())
app.use(rbac.cacheRouter)

app.use('/api/v1', require('./routes'))
```

### Patron B (legacy, 1 llamada por request)

```ts
const rbac = createRbacNode(
  process.env.AUTH_API!,
  process.env.APPLICATION_ID!
)

app.use(rbac.audit())
app.use(rbac.guard)
```

4) Proteger rutas individuales (solo Patron A).

```ts
router.get('/empleados', rbac.can('Empleados', 'Ver'), handler)
router.post('/empleados', rbac.can('Empleados', 'Agregar empleados'), handler)
```

5) Usar session check solo donde aplique.

```ts
router.use(rbac.sessionCheck)
```

6) Invalidar cache cuando cambien permisos.

```ts
import { invalidateByUserId } from '@oscardevpr/rbac-node'

await updateUserRoles(userId, newRoles)
invalidateByUserId(userId)
```

## Casos de uso
- APIs nuevas con `loadPermissions()` + `can()`.
- Migracion gradual usando `guard`.
- Auditoria de acciones con `audit()`.

## Checks de calidad
- `cookie-parser` instalado y montado antes de rbac.
- `rbac.audit()` va antes de otros middlewares.
- `rbac.loadPermissions()` va antes de rutas protegidas.
- `RBAC_WEBHOOK_SECRET` configurado en server e itr-authenticator.

## Referencias
- [Referencia rbac-node](./references/rbac-node.md)
