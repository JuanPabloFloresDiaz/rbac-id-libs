---
name: skill-ts-documenter
description: "Documenta cualquier paquete TypeScript del monorepo generando skill.md y references/ optimizados para agentes AI."
argument-hint: "Indica el nombre del paquete (ej: rbac-core) y su ruta relativa desde packages/ (ej: rbac-core/)."
keywords: [documentation, skill, typescript, monorepo, generator, agent, documenter]
---

# Documentar un paquete TypeScript para agentes AI

## Cuando usar
- Agregaste un paquete nuevo al monorepo y necesitas que agentes AI puedan usarlo.
- Actualizaste la API pública de un paquete y los skills existentes quedaron desactualizados.
- Quieres crear el skill y el reference lookup de un paquete desde cero.

## Entradas requeridas
- Nombre del paquete (ej: `rbac-core`, `rbac-node`, `rbac-vue`).
- Ruta relativa desde `packages/` (ej: `rbac-core/`).

## Dependencias previas
- El paquete ya debe existir en el monorepo con su `src/index.ts` completo.
- `package.json` del paquete debe estar actualizado con `name`, `description`, `version`, `peerDependencies`.

## Procedimiento

1) Leer `package.json` y clasificar el tipo de paquete.

```ts
// Leer: packages/{nombre}/package.json
// Extraer: name, description, version, peerDependencies, dependencies

// Clasificacion determinista:
// - "express" en peerDependencies → tipo: express-middleware
// - "vue" o "pinia" en peerDependencies → tipo: vue-plugin
// - Ninguno de los anteriores → tipo: pure-ts
```

2) Mapear la API publica completa.

```ts
// Leer: packages/{nombre}/src/index.ts
// Cada linea export { ... } o export function/interface/type es un simbolo publico.

// Para cada simbolo:
//   Leer su archivo fuente directo (no los imports de ese archivo).
//   Extraer: nombre, tipo (function | interface | type | const | class),
//            firma completa con tipos TypeScript,
//            si hace throw: extraer el string literal del mensaje.
```

3) Localizar todos los endpoints HTTP consumidos.

```ts
// Grep en packages/{nombre}/src/**:
//   axios.get(   axios.post(   axios.put(   axios.delete(
//   getApi().get(  getApi().post(
// Para cada match: anotar metodo HTTP, path literal, nombre de la funcion que lo llama.
// Si no hay axios → secccion de endpoints queda vacia.
```

4) Identificar restricciones de orden y flags de comportamiento.

```ts
// Grep en packages/{nombre}/src/** por:
//   debugMode        → documentar el bypass que produce cuando es true
//   throw new Error( → extraer string literal del mensaje y la condicion exacta
//   req.rbac         → indica que este middleware depende de loadPermissions()
//   req.cookies      → indica que cookie-parser debe montarse antes
//   createPinia      → indica que Pinia debe registrarse antes del plugin
```

5) Seleccionar la plantilla segun el tipo clasificado en el Paso 1.

```
pure-ts           → leer: packages/skills/skill-ts-documenter/templates/skill-pure-ts.md
express-middleware → leer: packages/skills/skill-ts-documenter/templates/skill-express-mw.md
vue-plugin         → leer: packages/skills/skill-ts-documenter/templates/skill-vue-plugin.md
```

6) Redactar `packages/skills/skill-{nombre}/skill.md`.

Reglas obligatorias para el contenido:
- Frontmatter `description`: < 120 caracteres, formato "Verbo + @scope/paquete + qué hace + dónde".
- Frontmatter `argument-hint`: que debe proveer el agente consumidor para usar el skill.
- Seccion **"Firmas de funciones"**: una entrada por export de tipo funcion o metodo, usando la firma TypeScript literal extraida en el Paso 2 (no parafraseada).
- Seccion **"Condiciones de error"**: solo errores que el agente puede provocar por mal uso; incluir el string literal del throw exacto.
- Seccion **"Dependencias previas"**: listar lo que debe existir o montarse antes de usar este paquete.
- Todo el contenido en español; codigo, firmas e identificadores en TypeScript/ingles.
- Al menos un code block ejecutable por cada paso del Procedimiento.

7) Redactar `packages/skills/skill-{nombre}/references/{nombre}.md`.

El archivo de referencia es un lookup card compacto (maximo 50 lineas):

```markdown
# Referencia {nombre}

## API publica exportada
| Export | Tipo | Firma resumida |
|--------|------|----------------|
| ...    | ...  | ...            |

## Endpoints HTTP consumidos
- METHOD /path → descripcion de cuando se llama

## Tipos clave
(solo las interfaces que el agente necesita para construir payloads)

## Flags de comportamiento
- debugMode: true → ...

## Restricciones de orden
- X debe montarse/llamarse antes de Y

## Documento principal
Revisar README en `{nombre}/README.md`.
```

8) Ejecutar checklist de calidad antes de entregar.

```
Cobertura:
[ ] Cada export de src/index.ts tiene entrada en "Firmas de funciones".
[ ] Cada endpoint HTTP del Paso 3 aparece en references/.
[ ] debugMode documentado si existe en el source.

Precision:
[ ] Firmas son copia literal del source, no parafrasis.
[ ] Parametros opcionales marcados con ? igual que en el source.
[ ] Strings literales de throw copiados exactamente del source.

Accionabilidad:
[ ] Al menos un code block ejecutable por paso de Procedimiento.
[ ] "Entradas requeridas" lista solo variables externas que el agente consumidor debe proveer.
[ ] frontmatter description ≤ 120 caracteres.

Estructura:
[ ] Archivo vive en packages/skills/skill-{nombre}/skill.md
[ ] Companion vive en packages/skills/skill-{nombre}/references/{nombre}.md
[ ] name en frontmatter es "skill-{nombre}" (sin scope @org/)
```

## Casos de uso
- Paquete nuevo: `skill-rbac-react`, `skill-rbac-svelte`, cualquier nueva libreria del monorepo.
- Actualizacion mayor de API: re-documentar un skill existente cuando cambian las firmas.
- Auditoria: verificar que un skill existente cubre todos los exports actuales del paquete.

## Checks de calidad
- Los templates en `templates/` son el esqueleto exacto — no agregar secciones no definidas en la plantilla.
- El skill generado no reemplaza el README del paquete — son documentos para audiencias distintas.
- Un agente AI debe poder usar el paquete correctamente leyendo solo el skill.md generado y su references/.

## Referencias
- [Referencia ts-documenter](./references/ts-documenter.md)
- [Plantilla pure-ts](./templates/skill-pure-ts.md)
- [Plantilla express-middleware](./templates/skill-express-mw.md)
- [Plantilla vue-plugin](./templates/skill-vue-plugin.md)
