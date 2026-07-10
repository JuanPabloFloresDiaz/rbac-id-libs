# Contrato de datos institucional ? Fase 1

Este contrato acompa?a el esquema aditivo del autenticador. No es todav?a una API p?blica de los SDK.

## Institution

```ts
interface Institution {
  id: string
  code: string
  name: string
  countryCode: string
  currencyCode: string
  timezone: string
  locale: string
  isActive: boolean
}
```

## InstitutionApplication

```ts
interface InstitutionApplication {
  id: string
  institutionId: string
  applicationId: string
  installedTemplateVersion: string | null
  settings: Record<string, unknown>
  isActive: boolean
}
```

## InstitutionContext futuro

Los SDK v2 enviar?n `appKey + institutionId`. El servidor resolver? `InstitutionApplication` y nunca tratar? el selector recibido como prueba de autorizaci?n.

## Compatibilidad

Los SDK v1 no cambian en Fase 1. La configuraci?n por objeto, selecci?n de instituci?n y tipos p?blicos se implementar?n en las fases de SDK despu?s de estabilizar los endpoints tenant-aware.
## Decisión sobre configuración

`Institution` no expone `settings`. Los campos globales se mantienen tipados y el JSONB solo permanece en `InstitutionApplication`, donde existe un scope concreto por aplicación e institución.

## Endpoints implementados en Fase 2

```text
GET /api/v2/institutions/me?appKey={appKey}
GET /api/v2/permissions/me?appKey={appKey}&institutionId={uuid}
POST /api/v1/permissions/check
```

`permissions/check` acepta `institutionId` opcional por compatibilidad. Los SDK v2 deberan enviarlo siempre; el servidor devuelve `context.userId`, `context.institutionId` y `context.institutionApplicationId` despues de validarlos.



# Runtime tenant-aware - Fase 3

## rbac-core / rbac-vue

La configuración v2 usa objeto; la firma posicional continúa disponible como adaptador v1:

```ts
app.use(RbacPlugin, {
  authApiUrl: 'https://auth.example.com/api/v1',
  appKey: 'PAYROLL',
  // opcional si la aplicación mostrará selector
  institutionId: initialInstitutionId,
})
```

`getMyInstitutions()` descubre contextos válidos. `getMyPermissions(institutionId)` consulta v2 cuando existe tenant y usa el endpoint compatible v1 cuando no existe. El store Vue expone `institutions`, `institution`, `institutionApplication`, `userTypes` y `needsInstitutionSelection`. `selectInstitution(id)` limpia permisos anteriores antes de cargar el nuevo contexto.

## rbac-node

```ts
const rbac = createRbacNode({
  authApiUrl: 'https://auth.example.com',
  appKey: 'PAYROLL',
  institutionResolver: req => req.headers['x-institution-id'] as string,
})
```

La configuración v2 exige institución por defecto. Puede fijarse con `institutionId` o resolverse por request con `institutionResolver`. El header es solo un selector: itr-authenticator siempre valida membresía e instalación.

`req.rbac` incluye `userId`, `appKey`, `institutionId`, `institutionApplicationId` y `permissions`. El caché local se identifica por hash de token + aplicación + institución. El webhook admite `userId`, `appKey` e `institutionId` para invalidación granular.

## Compatibilidad

- `setRbacConfig(url, applicationId, debugMode, loginRoute)` permanece vigente.
- `createRbacNode(url, applicationId, ...)` permanece vigente y permite inferencia legacy.
- `RbacPlugin` mantiene la instalación posicional.
- Las aplicaciones nuevas deben usar configuración por objeto y tenant explícito.
