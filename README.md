# rbac-id-libs

Monorepo de librerías RBAC privadas para el ecosistema **itr-authenticator**.

Publicadas en **GitHub Packages** bajo el scope `@oscardevpr`.

---

## Paquetes

| Paquete | Versión | Descripción |
|---------|---------|-------------|
| [`@oscardevpr/rbac-core`](./rbac-core/README.md) | ![](https://img.shields.io/badge/version-1.0.0-blue) | Motor RBAC agnóstico de framework — config, permisos, HTTP y seeder |
| [`@oscardevpr/rbac-node`](./rbac-node/README.md) | ![](https://img.shields.io/badge/version-1.0.0-blue) | Middlewares Express — guard, audit y sessionCheck |
| [`@oscardevpr/rbac-vue`](./rbac-vue/README.md)   | ![](https://img.shields.io/badge/version-1.0.0-blue) | Plugin Vue 3 + Pinia — store, composables, directiva y componente |

---

## Instalar desde GitHub Packages

> Requiere un **Personal Access Token** de GitHub con permiso `read:packages`.

### 1. Configura el registry

Crea o edita el archivo `.npmrc` en la **raíz de tu proyecto consumidor**:

```ini
@oscardevpr:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. Carga el token

```powershell
# PowerShell — leer de .env
$env:GITHUB_TOKEN = (Get-Content .env | Select-String "GITHUB_TOKEN").ToString().Split("=")[1].Trim()
```

```bash
# bash / zsh
export GITHUB_TOKEN=$(grep GITHUB_TOKEN .env | cut -d '=' -f2)
```

O ponlo directamente en CI como variable de entorno `GITHUB_TOKEN`.

### 3. Instala el paquete que necesitas

```bash
# Solo el core (agnóstico de framework)
pnpm add @oscardevpr/rbac-core

# Para proyectos Express / Node.js
pnpm add @oscardevpr/rbac-node

# Para proyectos Vue 3 + Pinia
pnpm add @oscardevpr/rbac-vue
```

---

## Uso local (monorepo)

Si estás trabajando dentro de este mismo monorepo:

```bash
# instalar todas las dependencias
pnpm install

# build de todos los paquetes
pnpm --filter "@oscardevpr/*" build

# build de un paquete específico
pnpm --filter @oscardevpr/rbac-core build
```

---

## Dependencias entre paquetes

```
@oscardevpr/rbac-core          ← base, sin dependencias internas
       ↑
@oscardevpr/rbac-node          ← depende de rbac-core
@oscardevpr/rbac-vue           ← depende de rbac-core
```

---

## Publicación

Los paquetes se publican automáticamente en **GitHub Packages** cuando se hace push de un tag con formato `v*.*.*`:

```bash
git tag v1.0.1
git push origin v1.0.1
```

El workflow [`.github/workflows/publish.yml`](./.github/workflows/publish.yml) hace el build y publica los tres paquetes.

### Publicación manual

```bash
cd packages/rbac-core   && pnpm build && pnpm publish
cd packages/rbac-node   && pnpm build && pnpm publish
cd packages/rbac-vue    && pnpm build && pnpm publish
```

---

## Crear el token GITHUB_TOKEN para consumir los paquetes

1. Ve a [github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Genera un nuevo token con el scope `read:packages`
3. Guárdalo en tu `.env`:

```dotenv
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

> Para publicar (CI/CD) el token necesita además el scope `write:packages`.
