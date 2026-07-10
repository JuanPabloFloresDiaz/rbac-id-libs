# Baseline legacy para migraci?n multi-tenant

Este documento registra qu? partes de los SDK deben migrarse junto con `itr-authenticator`.

## rbac-core

- Configuraci?n singleton y posicional: `authApiUrl`, `applicationId`, `debugMode`, `loginRoute`.
- Consulta permisos mediante `/users/:id/application/:appId/get-user-type-actions`.
- No modela instituci?n ni instalaci?n de aplicaci?n.
- `runSeeder` env?a `appKey` sin identidad de servicio.

## rbac-node

- `guard` consume `/permissions/check` con `appKey`, m?todo y path.
- `loadPermissions` consume `/permissions/my-permissions`, hoy inexistente en el servidor.
- Extrae cookie o Bearer, pero reenv?a el token como cookie.
- Cach? local identificada solo por hash de token.
- Webhook invalida solo por `userId`.
- `req.rbac` no incluye instituci?n ni `InstitutionApplication`.

## rbac-vue

- Un solo usuario, aplicaci?n, tipo de usuario y conjunto de permisos.
- No lista ni selecciona instituciones.
- No limpia permisos al cambiar de contexto.
- Las APIs visuales `v-can`, `CanAccess` y `usePermission` deben conservarse.

## Contrato de compatibilidad

La versi?n v2 a?adir? configuraci?n por objeto y contexto institucional. Las firmas v1 permanecer?n temporalmente mediante adaptadores y deprecaciones. Sin tenant expl?cito, solo se inferir? contexto cuando exista una ?nica instituci?n v?lida.

## Pruebas baseline

`pnpm test` construye los tres paquetes y caracteriza:

- motor de permisos y debug bypass;
- shape del seeder;
- configuraci?n posicional;
- precedencia cookie/Bearer;
- exports p?blicos del SDK Vue.
