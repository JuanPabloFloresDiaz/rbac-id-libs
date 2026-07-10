---
name: skill-{NOMBRE}
description: "{VERBO} {SCOPE}/{NOMBRE}: {QUE_HACE}. Usar en {DONDE}."
argument-hint: "Indica {INPUT_PRINCIPAL} y el caso de uso ({CASOS})."
keywords: [{KEYWORD_1}, {KEYWORD_2}, {KEYWORD_3}]
---

# {TITULO_DE_ACCION}: {SCOPE}/{NOMBRE}

## Cuando usar
- {CASO_DE_USO_1}
- {CASO_DE_USO_2}
- No usar este paquete cuando {ANTI_CASO}.

## Entradas requeridas
- `{ENV_VAR_1}` ({descripcion}).
- `{ENV_VAR_2}` ({descripcion}).

## Dependencias previas
- {DEPENDENCIA_O_NINGUNA}

## Procedimiento

1) Instalar el paquete.

```bash
pnpm add {SCOPE}/{NOMBRE}
# o
npm install {SCOPE}/{NOMBRE}
```

2) Configurar el singleton una sola vez al inicio.

```ts
import { {FUNCION_CONFIG} } from '{SCOPE}/{NOMBRE}'

{FUNCION_CONFIG}(
  process.env.{ENV_VAR_1}!,
  process.env.{ENV_VAR_2}!
)
```

3) {USAR_FUNCION_PRINCIPAL}.

```ts
import { {EXPORT_PRINCIPAL} } from '{SCOPE}/{NOMBRE}'

// {EJEMPLO_DE_USO}
```

4) {PASO_OPCIONAL_SI_APLICA}.

```ts
import { {EXPORT_SECUNDARIO} } from '{SCOPE}/{NOMBRE}'

// {EJEMPLO_DE_USO}
```

## Firmas de funciones

```ts
// {SUBSISTEMA_1}
{FIRMA_LITERAL_1}
// {NOTA_SI_APLICA}

// {SUBSISTEMA_2}
{FIRMA_LITERAL_2}
```

## Condiciones de error
- `{FUNCION}` lanza `Error('{MENSAJE_EXACTO_DEL_THROW}')` cuando {CONDICION}.
- `{FUNCION}` retorna `{VALOR_FALLBACK}` si `{PARAM}` es `null` o `undefined`.

## Casos de uso
- {CASO_REAL_1}
- {CASO_REAL_2}

## Checks de calidad
- `{FUNCION_CONFIG}()` se llama una sola vez al inicio, no por request.
- `debugMode` es `false` en produccion.
- {CHECK_ADICIONAL}

## Referencias
- [Referencia {NOMBRE}](./references/{NOMBRE}.md)
