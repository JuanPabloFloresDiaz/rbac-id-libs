# Presentación — Ecosistema RBAC (`rbac-core` / `rbac-node` / `rbac-vue`)

---

## SLIDE 1 — Arquitectura y comunicación interna en producción

### Narración de apertura

El ecosistema RBAC se apoya en **una sola librería base, `rbac-core`**, que concentra
toda la lógica que no depende de ningún framework: la configuración global, el motor de
permisos y la comunicación HTTP con el servicio central `itr-authenticator`. Sobre esa
base se montan dos adaptadores: **`rbac-node`** (backend Express) y **`rbac-vue`**
(frontend Vue 3 + Pinia). Ninguno reimplementa la lógica de permisos: la heredan de core.
Así, la regla "¿este usuario puede hacer esta acción?" se responde **igual** en servidor
y cliente.

### Diagrama 1 — Capas y dependencias

```mermaid
graph TD
    subgraph FE["Frontend - Vue 3"]
        VUE["@oscardevpr/rbac-vue<br/>Plugin · Store Pinia · v-can · CanAccess"]
    end
    subgraph BE["Backend - Express"]
        NODE["@oscardevpr/rbac-node<br/>guard · loadPermissions · can · audit · cacheRouter"]
    end
    subgraph CORE["Base agnóstica"]
        C["@oscardevpr/rbac-core<br/>setRbacConfig · checkPermission · HTTP (axios) · seeder"]
    end
    AUTH["itr-authenticator<br/>(API central de identidad y permisos)"]

    VUE -->|setRbacConfig + HTTP helpers| C
    NODE -->|setRbacConfig + checkPermission| C
    C -->|HTTP REST| AUTH
    NODE -->|POST /permissions/check<br/>GET /my-permissions| AUTH
    VUE -.->|el navegador llama al backend| NODE
```

### Diagrama 2 — Flujo en producción (login → render → request protegido)

```mermaid
sequenceDiagram
    participant U as Usuario (Browser)
    participant V as rbac-vue (Pinia)
    participant N as rbac-node (Express)
    participant A as itr-authenticator

    Note over V,A: 1) Login y carga de permisos
    U->>V: credenciales
    V->>A: POST /user-sessions/login  (rbac-core HTTP)
    A-->>V: cookie access_token + user
    V->>A: GET /get-user-type-actions (rbac-core)
    A-->>V: permissions[] + userType + application
    V->>V: store.permissions = [...]  (estado Pinia)

    Note over V: 2) Render condicional (0 llamadas al backend)
    V->>V: v-can / CanAccess -> checkPermission() en memoria

    Note over U,A: 3) Acción protegida (doble validación)
    U->>N: POST /empleados (cookie access_token)
    N->>N: loadPermissions: cache HIT?
    alt Cache MISS
        N->>A: GET /permissions/my-permissions
        A-->>N: permissions[] (TTL 300s)
    end
    N->>N: can('Empleados','Agregar') -> checkPermission()
    N-->>U: 200 OK / 403 Forbidden
```

### Párrafos de soporte

**Configuración como fuente única de verdad.** Tanto `RbacPlugin.install()` (Vue) como
`createRbacNode()` (Node) llaman a `setRbacConfig(authApiUrl, applicationId, debugMode)`.
Esa función escribe en un *singleton de módulo* que el motor y la capa HTTP de core leen
después. Configuras la URL del autenticador y el ID de la app **una sola vez por proceso**.

**Doble validación (cliente + servidor).** En el frontend los permisos sirven a la
**experiencia de usuario** (ocultar botones, render condicional) — evaluados en memoria,
sin llamadas extra. La **seguridad real vive en el backend**: `rbac-node` revalida cada
petición contra `itr-authenticator`. El frontend nunca es la frontera de seguridad.

**Rendimiento: caché con TTL e invalidación por webhook.** `loadPermissions` cachea los
permisos en memoria con clave SHA-256 del token (TTL 300s): primer request = MISS (1
llamada HTTP), siguientes = HIT (0 llamadas). Al cambiar permisos, `itr-authenticator`
invoca `POST /rbac/cache/invalidate` (`cacheRouter`). Las verificaciones por ruta
(`can()`) son puras y síncronas: cero red.

**Observabilidad sin bloquear.** `audit()` registra cada acción contra `/audit-logs` en
*fire-and-forget*: nunca bloquea la respuesta. Igual el `seeder`, que sincroniza
categorías y acciones al arrancar sin frenar el boot.

---

## SLIDE 2 — Expansión a otras tecnologías sobre `rbac-core`

### Narración de apertura

La decisión de diseño más importante fue **aislar toda la lógica reutilizable en
`rbac-core` y dejarla libre de framework**. El motor de permisos son funciones puras de
TypeScript; la capa HTTP es axios estándar. Soportar una nueva tecnología **no requiere
reescribir la lógica**: solo un *adaptador delgado* que (1) llame a `setRbacConfig` al
iniciar, (2) guarde los permisos en el estado nativo de esa tecnología y (3) exponga
`checkPermission` de forma idiomática. `rbac-node` y `rbac-vue` son la prueba.

### Diagrama 3 — Core como hub, adaptadores como radios

```mermaid
graph LR
    CORE["@oscardevpr/rbac-core<br/>(motor puro + HTTP + config)"]

    CORE --- V["rbac-vue ✅<br/>Pinia + v-can"]
    CORE --- N["rbac-node ✅<br/>Express middlewares"]
    CORE -.-> R["rbac-react 🔜<br/>Context + hook usePermission + Can"]
    CORE -.-> NEXT["rbac-next 🔜<br/>middleware + Server Components"]
    CORE -.-> NEST["rbac-nestjs 🔜<br/>Guard + decorador @Can()"]
    CORE -.-> NG["rbac-angular 🔜<br/>Service + structural directive *can"]

    classDef done fill:#1b5e20,stroke:#0d3b13,color:#fff;
    classDef todo fill:#37474f,stroke:#1c2429,color:#fff,stroke-dasharray:5 3;
    class V,N done;
    class R,NEXT,NEST,NG todo;
```

### Diagrama 4 — El contrato del adaptador

```mermaid
graph TD
    subgraph CONTRACT["Contrato que TODO adaptador implementa"]
        S1["1 · Init: setRbacConfig(url, appId, debug)"]
        S2["2 · Estado: guardar permissions[] del usuario"]
        S3["3 · Lectura: checkPermission / checkPermissionAny"]
        S4["4 · Azúcar idiomática del framework"]
    end

    S4 --> VUE["Vue → v-can, CanAccess, usePermission"]
    S4 --> REACT["React → usePermission(), Can, ProtectedRoute"]
    S4 --> NODEX["Node → guard, can('Cat','Action'), audit"]
    S4 --> NESTJS["NestJS → @Can() decorator + RbacGuard"]
```

### Caso concreto: `rbac-react`

En React el adaptador sería casi un espejo de `rbac-vue`. El estado que en Vue vive en un
store Pinia, en React vive en un **Context + provider**. La directiva `v-can` se convierte
en un **componente `<Can>`**, y el composable `usePermission` en un **hook
`usePermission`** con la misma firma (`hasAccess`). La decisión sigue siendo la función
pura `checkPermission` de core. Esfuerzo: horas, no semanas.

### Equivalencias 1:1 entre frameworks

| Necesidad                     | rbac-vue (hoy)        | rbac-react (propuesto)      | rbac-node (hoy)            |
|-------------------------------|-----------------------|-----------------------------|----------------------------|
| Init config                   | `RbacPlugin`          | `<RbacProvider>`            | `createRbacNode()`         |
| Estado de permisos            | Store Pinia           | React Context               | Cache en memoria + `req.rbac` |
| Consulta programática         | `usePermission()`     | `usePermission()` (hook)    | `req.rbac.permissions`     |
| Render/acceso condicional     | `v-can` / `<CanAccess>` | `<Can>` / `<ProtectedRoute>` | `can('Cat','Action')`    |
| Motor de decisión             | `checkPermission` (core) | `checkPermission` (core) | `checkPermission` (core)   |

### Cierre (argumento de venta)

Incorporar React, Next.js, NestJS o Angular **no toca el núcleo del sistema**: la lógica
de permisos, la integración con `itr-authenticator` y las garantías de seguridad
permanecen centralizadas y probadas en un solo lugar. Cada nuevo framework es un paquete
pequeño que "traduce" core a su forma idiomática. Menos superficie de bugs, coherencia
entre plataformas y un RBAC que es **capacidad transversal del ecosistema**, no código
duplicado por proyecto.
