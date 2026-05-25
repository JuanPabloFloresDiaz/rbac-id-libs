# Especificaciones de Endpoints RBAC

**Base URL:** rbacConfig.authApiUrl
**Headers por defecto:** Content-Type: application/json
**Credenciales:** withCredentials: true
**Auth por cookie:** Cookie: access_token=<token>

---

## rbac-core (SDK / frontend)

### POST /rbac/seed
**Body**
```json
{
  "appKey": "APP_ID",
  "categories": [
    {
      "name": "Empleados",
      "actions": ["Agregar empleados", "Eliminar"]
    }
  ]
}
```
**Notas**
- Fire-and-forget.
- No bloquea el arranque.

---

### GET /user-sessions/verify-session
**Body:** ninguno
**Response**
```json
{
  "user": {
    "id": 123,
    "email": "user@company.com",
    "first_name": "Ana",
    "last_name": "Lopez",
    "user_type": "Admin"
  }
}
```

---

### GET /users/:id/application/:appId/get-user-type-actions
**Body:** ninguno
**Response**
```json
{
  "userType": { "id": 10, "name": "Admin" },
  "application": { "id": 2, "name": "Payroll" },
  "permissions": [
    { "category": "Empleados", "actions": ["Agregar empleados", "Eliminar"] }
  ]
}
```

---

### POST /user-sessions/login
**Body**
```json
{
  "user_name": "usuario",
  "password": "secreto"
}
```
**Response**
```json
{
  "message": "Login ok",
  "user": { "id": 123, "email": "user@company.com" }
}
```

---

### POST /user-sessions/login-by-core-token
**Body**
```json
{ "token": "CORE_SSO_TOKEN" }
```
**Response**
```json
{
  "message": "Login ok",
  "user": { "id": 123, "email": "user@company.com" }
}
```

---

### POST /user-sessions/logout
**Body:** ninguno
**Response**
```json
{ "message": "Logout ok" }
```

---

## rbac-node (middlewares)

### POST /api/v1/permissions/check
**Headers**
```
Cookie: access_token=<token>
```
**Body**
```json
{
  "appKey": "APP_ID",
  "method": "GET",
  "path": "/ruta/protegida"
}
```
**Response esperado:** 200 OK si permitido; 401/403 si no.

---

### GET /api/v1/user-sessions/verify-active-session
**Headers**
```
Cookie: access_token=<token>
```
**Body:** ninguno
**Notas**
- Puede devolver Set-Cookie con token rotado.

---

### POST /api/v1/audit-logs
**Headers**
```
Cookie: access_token=<token>
```
**Body**
```json
{
  "method": "POST",
  "path": "/ruta",
  "body": {
    "email": "user@company.com",
    "password": "[REDACTED]"
  }
}
```
**Notas**
- Campos sensibles se redacted automaticamente.
- Fire-and-forget (no bloquea la request principal).
