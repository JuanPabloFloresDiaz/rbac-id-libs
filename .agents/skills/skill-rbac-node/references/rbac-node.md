# Referencia rbac-node

## Endpoints usados
- `POST /api/v1/permissions/check` (modo legacy)
- `GET /api/v1/permissions/my-permissions?appKey=<applicationId>` (loadPermissions)
- `POST /rbac/seed` (seeder)
- `POST /rbac/cache/invalidate` (webhook de cache)

## Notas
- `rbac.cacheRouter` exige `x-rbac-secret` si `webhookSecret` esta definido.
- `rbac.can()` usa permisos ya cargados (0 llamadas HTTP).

## Documento principal
Revisar el README del paquete en `rbac-node/README.md`.
