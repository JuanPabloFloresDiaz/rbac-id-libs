# 🔐 Análisis Profundo del Sistema de Autenticación — Payroll System

> Documento generado para estandarizar el proceso de autenticación en una librería reutilizable.

---

## 📋 Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Componentes Principales](#3-componentes-principales)
4. [Flujo de Autenticación Completo](#4-flujo-de-autenticación-completo)
5. [Middleware: authGuard](#5-middleware-authguard)
6. [Middleware: auditUserAction](#6-middleware-audituseraction)
7. [Middleware: checkActiveTokenExpiration](#7-middleware-checkactivetokenexpiration)
8. [Integración en server.js](#8-integración-en-serverjs)
9. [Variables de Entorno Requeridas](#9-variables-de-entorno-requeridas)
10. [Manejo de Errores](#10-manejo-de-errores)
11. [Comportamiento por Entorno](#11-comportamiento-por-entorno)
12. [Contratos de Datos (Request/Response)](#12-contratos-de-datos-requestresponse)
13. [Dependencias Externas](#13-dependencias-externas)
14. [Patrones Identificados](#14-patrones-identificados)
15. [Propuesta de Librería Estandarizada](#15-propuesta-de-librería-estandarizada)

---

## 1. Visión General

El sistema de autenticación del Payroll System **NO gestiona autenticación localmente**. En su lugar, **delega completamente** la autenticación y autorización a un servicio externo llamado **`itr-authenticator`**, que corre en `http://localhost:8015`.

### Modelo conceptual:

```
[Cliente / Browser]
       │
       │ Cookie: access_token=<JWT>
       ▼
[Payroll Server :5001]
       │
       ├─► auditUserAction()     ← Registra quién hace qué
       ├─► authGuard             ← Verifica permisos en itr-authenticator
       └─► checkActiveTokenExpiration ← Verifica sesión activa
              │
              ▼
     [itr-authenticator :8015]
              │
              ├─ /api/v1/user-sessions/verify-active-session
              ├─ /api/v1/permissions/check
              └─ /api/v1/audit-logs
```

El Payroll Server actúa como **Resource Server** (no como Authorization Server). Toda la lógica de tokens, sesiones y usuarios vive en `itr-authenticator`.

---

## 2. Arquitectura del Sistema

### 2.1 Servicios involucrados

| Servicio | Puerto | Rol |
|---|---|---|
| `payroll-server` | `5001` | Resource Server (API de negocio) |
| `itr-authenticator` | `8015` | Authorization Server (tokens, sesiones, permisos, auditoría) |

### 2.2 Mecanismo de transporte de credenciales

- **Tipo:** HTTP Cookie
- **Nombre de la cookie:** `access_token`
- **Valor:** JWT (JSON Web Token)
- **Flag:** `HttpOnly` (infiere por el uso de `cookieParser` + `credentials: true`)

### 2.3 Archivos clave

```
src/
├── server.js                              ← Punto de entrada, registro de middlewares
├── middlewares/
│   ├── auth.middleware.js                 ← authGuard + auditUserAction
│   ├── authValidator.middleware.js        ← checkActiveTokenExpirationMiddleware
│   └── errorHandler.middleware.js        ← Manejador global de errores
└── utils/
    ├── env.js                             ← Variables de entorno validadas
    ├── HttpError.js                       ← Clase de error HTTP personalizada
    └── asyncCatch.js                      ← Wrapper para async/await en middlewares
```

---

## 3. Componentes Principales

### 3.1 `auth.middleware.js`

Exporta **dos** elementos:

```javascript
module.exports = { auditUserAction, authGuard };
```

#### `authGuard` — Middleware de autorización
- Tipo: `async (req, res, next) => {}`
- Función: Verifica que el usuario autenticado tenga permiso para acceder al endpoint específico.
- Comunicación: `POST /api/v1/permissions/check` en `itr-authenticator`

#### `auditUserAction(options)` — Factory de middleware de auditoría
- Tipo: `(options) => (req, res, next) => {}`
- Función: Registra cada acción del usuario en el sistema de auditoría.
- Comunicación: `POST /api/v1/audit-logs` en `itr-authenticator`

### 3.2 `authValidator.middleware.js`

Exporta **un** elemento:

```javascript
module.exports = checkActiveTokenExpirationMiddleware;
```

#### `checkActiveTokenExpirationMiddleware` — Middleware de validación de sesión
- Tipo: `catchErrors(async (req, res, next) => {})`
- Función: Verifica que la sesión del usuario esté activa y refresca el token si es necesario.
- Comunicación: `GET /api/v1/user-sessions/verify-active-session` en `itr-authenticator`

---

## 4. Flujo de Autenticación Completo

### 4.1 Request entrante — Secuencia de middlewares

```
HTTP Request
     │
     ▼
cookieParser()              ← Parsea cookies → req.cookies.access_token
     │
     ▼
helmet()                    ← Headers de seguridad
morgan()                    ← Logging HTTP
compression()               ← Compresión gzip
cors()                      ← Control de origen
     │
     ▼
auditUserAction()  ──────── 1. Extrae: método, path, body sanitizado, cookie
     │              │       2. POST → itr-authenticator/api/v1/audit-logs
     │              │       3. NUNCA bloquea la request (fire-and-forget)
     │              └───►  next() siempre se llama
     │
     ▼
authGuard  ─────────────── 1. Extrae: APPLICATION_ID, AUTH_API del .env
     │              │       2. Extrae: método HTTP, path limpio de la request
     │              │       3. Extrae: cookie access_token
     │              │       4. POST → itr-authenticator/api/v1/permissions/check
     │              │       5. Si autorizado → next()
     │              │       6. Si no autorizado → 403 Forbidden
     │              └───►  Puede bloquear la request
     │
     ▼
[Router /api/v1/]
     │
     ▼
[Controller] → [Service] → [Model/DB]
     │
     ▼
Response al cliente
```

### 4.2 Flujo de `checkActiveTokenExpirationMiddleware`

Este middleware se usa en rutas específicas (no globalmente en server.js), probablemente aplicado en routers individuales:

```
Request con cookie access_token
     │
     ▼
En producción solamente:
     │
     ▼
GET itr-authenticator/api/v1/user-sessions/verify-active-session
     Headers: { Cookie: "access_token=<token>" }
     │
     ├── 200 OK ──► ¿Hay Set-Cookie en respuesta?
     │                    │ Sí → Propaga la nueva cookie al cliente (refresh)
     │                    └── next()
     │
     └── Error ──► throw HttpError(401, "La sesión ha expirado.", "/areas")
                        │
                        └── errorHandler captura → responde 401
```

---

## 5. Middleware: authGuard

### 5.1 Código conceptual completo

```javascript
const authGuard = async (req, res, next) => {
  const appKey = process.env.APPLICATION_ID;
  const baseURL = process.env.AUTH_API;
  const { NODE_ENV } = process.env;

  // BYPASS: Si no hay configuración, permitir en desarrollo
  if (!appKey || !baseURL) {
    if (NODE_ENV === "development") {
      console.warn('[authGuard] Falta APPLICATION_ID o AUTH_API. Permitiendo acceso.');
    }
    return next();
  }

  const method = req.method;
  const path = req.baseUrl + req.path; // path limpio sin query params
  const token = req.cookies.access_token;

  // POST al servicio de autenticación
  const response = await axios.post(
    `${baseURL}/api/v1/permissions/check`,
    {
      appKey,
      method,
      path,
    },
    {
      headers: { Cookie: `access_token=${token}` },
      withCredentials: true,
    }
  );

  // Si autorizado → continuar
  // Si no → 403
};
```

### 5.2 Payload enviado a `itr-authenticator`

```json
{
  "appKey": "APPLICATION_ID_del_.env",
  "method": "GET | POST | PUT | DELETE | PATCH",
  "path": "/api/v1/empleados/123"
}
```

### 5.3 Lógica de bypass

| Condición | Comportamiento |
|---|---|
| `APPLICATION_ID` no definido | `next()` sin verificar |
| `AUTH_API` no definido | `next()` sin verificar |
| Ambos definidos | Verifica en `itr-authenticator` |

---

## 6. Middleware: auditUserAction

### 6.1 Firma

```javascript
function auditUserAction(options = {}) {
  return (req, res, next) => { ... };
}
```

### 6.2 Datos que captura

```javascript
{
  method: req.method,           // "GET", "POST", etc.
  path: req.path,               // "/api/v1/empleados"
  body: sanitizeBody(req.body), // body sin campos sensibles
  cookie: req.cookies.access_token
}
```

### 6.3 `sanitizeBody(body)`

Función que limpia el body antes de auditarlo, eliminando campos sensibles (contraseñas, tokens, etc.).

### 6.4 Comportamiento de auditoría

- **Fire-and-forget**: El middleware llama a `next()` **inmediatamente**, la petición HTTP a `itr-authenticator` ocurre en background.
- **Nunca bloquea**: Aunque falle el envío de auditoría, la request continúa normalmente.
- **Manejo de errores silencioso**:
  - En `development`: log detallado con stack, config axios, response completa.
  - En otros entornos no producción: solo `err.message`.
  - En `production`: silencio total (no logs).

### 6.5 Endpoint de destino

```
POST {AUTH_API}/api/v1/audit-logs
Headers: { Cookie: "access_token=<token>" }
Body: { method, path, body }
```

---

## 7. Middleware: checkActiveTokenExpiration

### 7.1 Ubicación

```
src/middlewares/authValidator.middleware.js
```

### 7.2 Dependencias

```javascript
const { catchErrors } = require("../utils/asyncCatch");
const { ENV } = require('../utils/env');
const axios = require("axios");
const { HttpError } = require("../utils/HttpError");
```

### 7.3 Lógica completa

```javascript
const checkActiveTokenExpirationMiddleware = catchErrors(async (req, res, next) => {
  // BYPASS total en non-production
  if (ENV.NODE_ENV != 'production') {
    next();
    return;
  }

  const token = req.cookies.access_token;

  const authResponse = await axios.get(
    "http://localhost:8015/api/v1/user-sessions/verify-active-session",
    {
      headers: { Cookie: `access_token=${token}` },
      withCredentials: true,
    }
  );

  // Propagar cookie refrescada si el auth server la renueva
  const setCookieHeader = authResponse.headers['set-cookie'];
  if (setCookieHeader) {
    setCookieHeader.forEach(cookie => {
      res.append('Set-Cookie', cookie);
    });
  }

  next();
  // En catch: throw HttpError(401, "La sesión ha expirado.", "/areas")
});
```

### 7.4 Refresh de token transparente

El sistema soporta **token refresh transparente**: si `itr-authenticator` renueva el JWT durante la verificación, retorna el nuevo token en el header `Set-Cookie`. Este middleware lo propaga al cliente automáticamente sin que el usuario note nada.

---

## 8. Integración en server.js

### 8.1 Orden de middlewares (crítico)

```javascript
// 1. Cookie parsing — DEBE ir primero para que authGuard tenga acceso a cookies
app.use(cookieParser());

// 2. Parsing de body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Seguridad y utilidades
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// 4. Auditoría — antes de authGuard, registra TODOS los intentos
app.use(auditUserAction());

// 5. Autorización — bloquea requests no autorizadas
app.use(authGuard);

// 6. Rutas de negocio
app.use("/api/v1/", routes);

// 7. Healthcheck — DESPUÉS de authGuard (¿debería ser antes?)
app.use("/health", (req, res) => { ... });

// 8. Error handler — siempre al final
app.use(errorHandler);
```

### 8.2 Observación importante: `/health` endpoint

El endpoint `/health` está registrado **después** de `authGuard`, lo que significa que también requiere autenticación. Esto puede ser un problema para sistemas de monitoreo externos.

---

## 9. Variables de Entorno Requeridas

### 9.1 Para autenticación

| Variable | Descripción | Ejemplo |
|---|---|---|
| `APPLICATION_ID` | Identificador único de esta app en itr-authenticator | `"payroll-system"` |
| `AUTH_API` | URL base del servicio itr-authenticator | `"http://localhost:8015"` |
| `NODE_ENV` | Entorno de ejecución | `"development"` / `"production"` |

### 9.2 Para CORS (relacionado con auth)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos separados por coma | `"http://localhost:3000,https://app.com"` |

### 9.3 Comportamiento según `NODE_ENV`

| `NODE_ENV` | `authGuard` | `auditUserAction` | `checkActiveTokenExpiration` |
|---|---|---|---|
| `development` | Bypass si no hay config | Logs detallados de error | **Bypass total** → `next()` |
| `production` | Activo siempre | Sin logs | Activo, verifica sesión |
| Otro | Activo si hay config | Log resumido | **Bypass total** → `next()` |

---

## 10. Manejo de Errores

### 10.1 `HttpError`

```javascript
// src/utils/HttpError.js
class HttpError extends Error {
  constructor(statusCode, message, redirectTo) {
    super(message);
    this.statusCode = statusCode;
    this.redirectTo = redirectTo; // Para redirecciones cliente
  }
}
```

Uso en autenticación:
```javascript
throw new HttpError(401, "La sesión ha expirado.", "/areas");
```

### 10.2 `catchErrors` (asyncCatch)

```javascript
// src/utils/asyncCatch.js
const catchErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

- Envuelve middlewares async para que los errores sean capturados por `errorHandler`.
- Evita el patrón `try/catch` repetitivo.

### 10.3 `errorHandler.middleware.js`

Recibe todos los errores no manejados, incluyendo `HttpError` de autenticación:
- Lee `err.statusCode` para responder con el código correcto.
- Maneja `err.redirectTo` si existe.

---

## 11. Comportamiento por Entorno

### 11.1 Development

```
✅ authGuard: Se puede deshabilitar con solo no poner APPLICATION_ID en .env
✅ checkActiveTokenExpiration: Completamente deshabilitado (next() directo)
✅ auditUserAction: Funciona pero con logs detallados de errores
✅ Swagger UI: Disponible en /api-docs
```

### 11.2 Production

```
🔒 authGuard: SIEMPRE activo (con APPLICATION_ID + AUTH_API configurados)
🔒 checkActiveTokenExpiration: SIEMPRE activo, verifica sesión en itr-authenticator
🔇 auditUserAction: Activo pero silencioso en errores
❌ Swagger UI: Deshabilitado
```

---

## 12. Contratos de Datos (Request/Response)

### 12.1 `POST /api/v1/permissions/check` (itr-authenticator)

**Request (desde authGuard):**
```json
{
  "appKey": "string",
  "method": "GET|POST|PUT|DELETE|PATCH",
  "path": "/api/v1/recurso/id"
}
```
**Headers:** `Cookie: access_token=<JWT>`

**Response esperada:**
- `200 OK` → Autorizado → `next()`
- `403 Forbidden` → No autorizado → responde 403 al cliente
- `401 Unauthorized` → Token inválido/expirado → responde 401

### 12.2 `GET /api/v1/user-sessions/verify-active-session` (itr-authenticator)

**Request (desde checkActiveTokenExpiration):**
- Sin body
- **Headers:** `Cookie: access_token=<JWT>`

**Response esperada:**
- `200 OK` → Sesión válida
  - Puede incluir `Set-Cookie: access_token=<nuevo_JWT>` para refresh
- `401 Unauthorized` / Error → Sesión expirada → `HttpError(401)`

### 12.3 `POST /api/v1/audit-logs` (itr-authenticator)

**Request (desde auditUserAction):**
```json
{
  "method": "string",
  "path": "string",
  "body": {}
}
```
**Headers:** `Cookie: access_token=<JWT>`

**Response:** Ignorada (fire-and-forget)

---

## 13. Dependencias Externas

### 13.1 npm packages usados en autenticación

| Paquete | Versión | Uso |
|---|---|---|
| `axios` | * | HTTP client para llamadas a itr-authenticator |
| `cookie-parser` | * | Parsear `req.cookies.access_token` |
| `http` (Node built-in) | - | Agente HTTP en auth.middleware |
| `https` (Node built-in) | - | Agente HTTPS en auth.middleware |

### 13.2 Agentes HTTP personalizados

En `auth.middleware.js` se importan `http` y `https` nativos de Node, sugiriendo que se configuran agentes custom en axios para control de keep-alive o certificados.

---

## 14. Patrones Identificados

### 14.1 Patrón: Delegación Total de Auth

El sistema **no tiene ningún JWT decode local**. Todo se delega a `itr-authenticator`. Esto es una arquitectura de **microservicio de autenticación**.

### 14.2 Patrón: Cookie Pass-Through

Las cookies se pasan tal cual del cliente al servicio de autenticación:
```javascript
headers: { Cookie: `access_token=${token}` }
```
El servidor actúa como proxy de autenticación transparente.

### 14.3 Patrón: Fire-and-Forget Audit

La auditoría nunca bloquea. Es eventual y tolerante a fallos. Prioridad: UX > Registro.

### 14.4 Patrón: Environment-based Bypass

En desarrollo (`NODE_ENV !== 'production'`), los middlewares críticos tienen bypass. Facilita el desarrollo local sin necesitar `itr-authenticator` corriendo.

### 14.5 Patrón: Factory Middleware

`auditUserAction` es una factory function, permitiendo configuración por instancia:
```javascript
app.use(auditUserAction({ /* options */ }));
// vs
router.use(auditUserAction({ exclude: ['/health'] }));
```

### 14.6 Patrón: Transparent Token Refresh

El token se refresca automáticamente y se propaga al cliente sin intervención del código de negocio. El cliente siempre tiene un token fresco.

---

## 15. Propuesta de Librería Estandarizada

### 15.1 Nombre sugerido: `itr-auth-client`

### 15.2 API pública propuesta

```javascript
const { createItrAuth } = require('itr-auth-client');

const itrAuth = createItrAuth({
  authApiUrl: process.env.AUTH_API,          // URL del itr-authenticator
  applicationId: process.env.APPLICATION_ID, // ID de la app
  cookieName: 'access_token',               // Nombre de la cookie JWT
  bypassInDev: true,                        // Bypass en non-production
});

// Middlewares exportados
itrAuth.authGuard          // Middleware de autorización
itrAuth.auditUserAction()  // Factory de middleware de auditoría
itrAuth.checkSession       // Middleware de validación de sesión activa
```

### 15.3 Configuración mínima

```javascript
// En server.js de cualquier proyecto que use itr-authenticator
const { createItrAuth } = require('itr-auth-client');
const itrAuth = createItrAuth({
  authApiUrl: process.env.AUTH_API,
  applicationId: process.env.APPLICATION_ID,
});

app.use(itrAuth.auditUserAction());
app.use(itrAuth.authGuard);
```

### 15.4 Variables necesarias que la librería debe leer

```javascript
// Puede leerlas del proceso o recibirse en config
{
  AUTH_API: string,          // Requerido
  APPLICATION_ID: string,    // Requerido
  NODE_ENV: string,          // Para bypasses
  COOKIE_NAME: string        // Default: 'access_token'
}
```

### 15.5 Endpoints de itr-authenticator que la librería debe conocer

```javascript
const ENDPOINTS = {
  CHECK_PERMISSION:   '/api/v1/permissions/check',
  VERIFY_SESSION:     '/api/v1/user-sessions/verify-active-session',
  AUDIT_LOG:          '/api/v1/audit-logs',
};
```

### 15.6 Estructura de la librería

```
itr-auth-client/
├── package.json
├── index.js                  ← Punto de entrada, createItrAuth()
├── src/
│   ├── guards/
│   │   ├── authGuard.js      ← Lógica de authGuard
│   │   └── sessionGuard.js   ← Lógica de checkActiveTokenExpiration
│   ├── middlewares/
│   │   └── auditMiddleware.js ← Lógica de auditUserAction
│   ├── utils/
│   │   ├── sanitizeBody.js   ← Sanitización del body
│   │   ├── cookieProxy.js    ← Propagación de cookies
│   │   └── axiosClient.js    ← Cliente axios configurado
│   └── constants/
│       └── endpoints.js      ← URLs de itr-authenticator
├── README.md
└── types/
    └── index.d.ts            ← Tipos TypeScript (opcional)
```

---

## 📌 Resumen Ejecutivo

| Aspecto | Detalle |
|---|---|
| **Tipo de Auth** | Delegada a microservicio externo (`itr-authenticator`) |
| **Transporte** | HTTP Cookie (`access_token` con JWT) |
| **Verificación** | HTTP calls síncronas a `itr-authenticator` en cada request |
| **Autorización** | Por método HTTP + path + applicationId |
| **Auditoría** | Fire-and-forget, nunca bloquea |
| **Token Refresh** | Transparente, propagado via `Set-Cookie` |
| **Dev Bypass** | `checkActiveTokenExpiration` y `authGuard` (si no hay config) |
| **Librería objetivo** | `itr-auth-client` con `createItrAuth(config)` como API principal |