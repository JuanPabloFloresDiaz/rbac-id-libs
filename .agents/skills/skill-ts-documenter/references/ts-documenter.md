# Referencia ts-documenter

## Clasificacion de tipos de paquete
| Signal en peerDependencies | Tipo asignado |
|----------------------------|---------------|
| `"express"` | `express-middleware` |
| `"vue"` o `"pinia"` | `vue-plugin` |
| Ninguno | `pure-ts` |

## Plantillas disponibles
| Tipo | Archivo de plantilla |
|------|----------------------|
| `pure-ts` | `templates/skill-pure-ts.md` |
| `express-middleware` | `templates/skill-express-mw.md` |
| `vue-plugin` | `templates/skill-vue-plugin.md` |

## Secciones obligatorias en todo skill generado
1. Cuando usar
2. Entradas requeridas
3. Dependencias previas
4. Procedimiento (con code blocks)
5. Firmas de funciones
6. Condiciones de error
7. Casos de uso
8. Checks de calidad
9. Referencias

## Secciones exclusivas por tipo
- `express-middleware` → agrega **Orden de montaje** (seccion propia, no solo en Checks)
- `vue-plugin` → agrega **Reactividad** (nota sobre ComputedRef vs plain en composables)

## Reglas de formato del frontmatter
- `description`: verbo + @scope/paquete + que hace + donde. Max 120 chars.
- `argument-hint`: que debe proveer el agente consumidor al invocar el skill.
- `keywords`: array de strings, minimo 5 terminos.
- `name`: `skill-{nombre-sin-scope}` (ej: `skill-rbac-core`, nunca `skill-@oscardevpr/rbac-core`)

## Archivos de salida por paquete documentado
```
packages/skills/skill-{nombre}/
  skill.md              ← guia de uso para agentes
  references/{nombre}.md ← lookup card compacto
```

## Anti-patrones a evitar
- No parafrasear firmas de funciones — copiar literalmente del source.
- No documentar tipos internos (`@internal`) en el references.
- No incluir instrucciones de build/publish en el skill (van en README).
- No mezclar endpoints de distintos paquetes en el mismo references.
- No actualizar README del paquete como parte de este skill (audiencias distintas).

## Documento principal
Skill completo en `skills/skill-ts-documenter/skill.md`.
