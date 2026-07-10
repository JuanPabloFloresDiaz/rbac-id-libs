---
name: skill-{NOMBRE}
description: "Instala y configura {SCOPE}/{NOMBRE} en Vue 3 + Pinia. Incluye {PLUGIN}, {COMPOSABLE_PRINCIPAL}, {DIRECTIVA} y {COMPONENTE}."
argument-hint: "Indica tu main.ts y si necesitas ejemplos con {COMPOSABLE_PRINCIPAL}, {DIRECTIVA} o {COMPONENTE}."
keywords: [{KEYWORD_1}, vue, pinia, composable, {KEYWORD_5}]
---

# Implementar {SCOPE}/{NOMBRE} en Vue 3

## Cuando usar
- App Vue 3 con {CASO_PRINCIPAL}.
- Necesitas plugin, directiva y composables listos para usar.

## Entradas requeridas
- `{VITE_AUTH_URL}` (URL base del servicio de autenticacion).
- `{VITE_APP_ID}` (ID de la aplicacion registrada).
- `{VITE_APP_MODE}` (`"production"` o `"debugging"`).

## Dependencias previas
- `pinia` instalado y `createPinia()` registrado ANTES del plugin.
- Vue Router instalado si usas `{COMPOSABLE_GUARD}`.

## Procedimiento

1) Instalar el paquete.

```bash
pnpm add {SCOPE}/{NOMBRE}
```

2) Definir variables de entorno.

```dotenv
{VITE_AUTH_URL}="http://localhost:{PUERTO}/api/v1"
{VITE_APP_ID}="{APP_ID_EJEMPLO}"
{VITE_APP_MODE}="production"
```

3) Registrar el plugin en main.ts.

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { {PLUGIN} } from '{SCOPE}/{NOMBRE}'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())          // Pinia ANTES del plugin
app.use(
  {PLUGIN},
  import.meta.env.{VITE_AUTH_URL},
  import.meta.env.{VITE_APP_ID},
  import.meta.env.{VITE_APP_MODE} === 'debugging'  // debugMode
)

app.mount('#app')
```

4) Usar permisos en componentes.

```ts
// En script setup:
import { {COMPOSABLE_PRINCIPAL} } from '{SCOPE}/{NOMBRE}'

const { {METODO_HAS_ACCESS} } = {COMPOSABLE_PRINCIPAL}('{CATEGORIA}')
{METODO_HAS_ACCESS}('{ACCION}')   // boolean
```

```html
<!-- Directiva (oculta con display:none si sin permiso) -->
<button v-{DIRECTIVA}="{ category: '{CATEGORIA}', action: '{ACCION}' }">
  {LABEL}
</button>

<!-- Componente (no monta si sin permiso) -->
<{COMPONENTE} category="{CATEGORIA}" action="{ACCION}">
  <button>{LABEL}</button>
</{COMPONENTE}>
```

5) Usar el store para control avanzado de sesion.

```ts
import { {STORE_FN} } from '{SCOPE}/{NOMBRE}'

const store = {STORE_FN}()
await store.{METODO_CHECK_AUTH}()
await store.{METODO_LOGIN}(user_name, password)
await store.{METODO_LOGOUT}()
```

## Firmas de funciones

```ts
// Plugin
{FIRMA_PLUGIN}

// Composable principal
{FIRMA_COMPOSABLE}
// Retorna:
//   hasAccess(action: string): boolean
//   isAuthenticated: ComputedRef<boolean>
//   userData: ComputedRef<{USER_TYPE} | null>
//   permissions: ComputedRef<{PERMISSION_TYPE}[]>

// Composable sin categoria (busca en todos los permisos)
{FIRMA_COMPOSABLE_SIN_CATEGORIA}
// Retorna los mismos campos + hasAccess busca en cualquier categoria

// Directiva
{FIRMA_DIRECTIVA}
// v-{DIRECTIVA}="{ category: string, action: string }"
// Efecto: aplica display:none si el usuario no tiene el permiso

// Componente
// <{COMPONENTE} category="string" action="string">slot</{COMPONENTE}>
// Efecto: no monta el slot si el usuario no tiene el permiso

// Store
{FIRMA_STORE}
// Estado: isAuthenticated: boolean, userData: {USER_TYPE} | null, permissions: {PERMISSION_TYPE}[]
// Acciones: checkAuth(), loginWithCredentials(user, pass), logOut()
```

## Reactividad
- `{COMPOSABLE_PRINCIPAL}()` retorna `ComputedRef` para `isAuthenticated`, `userData` y `permissions` — son reactivos automaticamente.
- `hasAccess()` es una funcion plain (no ref) — llamarla en template es suficiente para reactividad porque depende del store que si es reactivo.
- `v-{DIRECTIVA}` re-evalua cuando cambia el store de permisos.

## Condiciones de error
- El plugin lanza error si `createPinia()` no fue registrado antes.
- `{COMPOSABLE_GUARD}` redirige a `{RUTA_LOGIN}` si la sesion no es valida (comportamiento configurable).
- `{STORE_FN}().{METODO_CHECK_AUTH}()` no lanza — retorna y actualiza el estado del store silenciosamente.
- `debugMode: true` hace que `hasAccess()` siempre retorne `true` (bypass de desarrollo).
- El seeder (`runSeeder`) NUNCA debe llamarse desde el frontend.

## Casos de uso
- Ocultar elementos UI con `v-{DIRECTIVA}`.
- Bloquear render de secciones con `{COMPONENTE}`.
- Logica condicional TypeScript-safe con `{COMPOSABLE_PRINCIPAL}`.
- Control total de sesion desde el store.

## Checks de calidad
- `createPinia()` registrado ANTES de `{PLUGIN}` en main.ts.
- `debugMode` solo en desarrollo (leer de variable de entorno).
- Nunca llamar `runSeeder` desde el frontend.
- `{VITE_APP_MODE}` configurado correctamente en cada entorno.

## Referencias
- [Referencia {NOMBRE}](./references/{NOMBRE}.md)
