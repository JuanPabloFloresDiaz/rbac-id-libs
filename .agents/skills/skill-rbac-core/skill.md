---
name: skill-rbac-core
description: "Instala, configura y usa @oscardevpr/rbac-core: singleton de config, motor de permisos, HTTP helpers y seeder. Usar en backend o librerias base."
argument-hint: "Indica authApiUrl, applicationId y el caso de uso (motor de permisos, HTTP, seeder)."
---

# Usar @oscardevpr/rbac-core (Base RBAC)

## Cuando usar
- Necesitas el motor de permisos puro en backend o tests.
- Vas a consumir helpers HTTP de itr-authenticator.
- Quieres ejecutar el seeder desde servidor.
- Estas creando una libreria base o integracion sin `rbac-node` o `rbac-vue`.

## Entradas requeridas
- `AUTH_API_URL` (URL base de itr-authenticator).
- `APPLICATION_ID` (ID de app registrada).

## Procedimiento

1) Instalar el paquete.

```bash
pnpm add @oscardevpr/rbac-core
# o
npm install @oscardevpr/rbac-core
```

2) Configurar el singleton una sola vez.

```ts
import { setRbacConfig } from '@oscardevpr/rbac-core'

setRbacConfig(
  process.env.AUTH_API_URL!,
  process.env.APPLICATION_ID!,
  false,
  'login'
)
```

3) Usar el motor de permisos.

```ts
import { checkPermission, checkPermissionAny } from '@oscardevpr/rbac-core'

const permissions = [
  { category: 'Empleados', actions: ['Agregar empleados', 'Eliminar'] },
  { category: 'Planillas', actions: ['Crear', 'Ver'] },
]

checkPermission(permissions, 'Empleados', 'Agregar empleados')
checkPermission(permissions, 'Empleados', 'Exportar')
checkPermissionAny(permissions, 'Crear')
```

4) Usar helpers HTTP.

```ts
import {
  logInWithCredentials,
  logInByCoreToken,
  getAuthenticatedUserData,
  getUserTypeAndActions,
  signOut,
} from '@oscardevpr/rbac-core'

const login = await logInWithCredentials(user_name, password)
const session = await getAuthenticatedUserData()
const data = await getUserTypeAndActions(session.user.id)
await signOut()
```

5) Ejecutar seeder desde el servidor.

```ts
import { defineRbacSeed, runSeeder } from '@oscardevpr/rbac-core'

const seed = defineRbacSeed({
  Empleados: ['Agregar empleados', 'Editar datos', 'Eliminar'],
  Planillas: ['Crear', 'Ver', 'Cerrar planilla'],
})

runSeeder(seed) // POST /rbac/seed (fire-and-forget)
```

## Casos de uso
- Validacion de permisos en memoria antes de responder una request.
- Seeder al iniciar un servicio backend.
- Helpers HTTP en un job o CLI de administracion.

## Checks de calidad
- `setRbacConfig()` se llama una sola vez al inicio.
- Seeder se ejecuta solo en backend.
- `debugMode` es `false` en produccion.

## Referencias
- [Referencia rbac-core](./references/rbac-core.md)
