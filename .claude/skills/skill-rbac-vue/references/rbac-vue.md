# Referencia rbac-vue

## Flujo base
- `checkAuth()` -> `GET /user-sessions/verify-session`
- `loadPermissions()` -> `GET /users/{id}/application/{appId}/get-user-type-actions`

## Notas
- `debugMode: true` fuerza permisos en `true`.
- `v-can` oculta con `display: none`.
- `CanAccess` no monta el nodo si no hay permiso.

## Documento principal
Revisar el README del paquete en `rbac-vue/README.md`.
