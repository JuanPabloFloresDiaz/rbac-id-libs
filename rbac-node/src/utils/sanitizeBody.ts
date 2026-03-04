/**
 * Default set of fields that are always stripped from request bodies
 * before sending them to the audit log.
 */
const DEFAULT_SENSITIVE_FIELDS: ReadonlySet<string> = new Set([
  'password',
  'password_confirmation',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'api_key',
  'apiKey',
  'cvv',
  'pin',
  'credit_card',
  'card_number'
])

/**
 * Returns a shallow copy of `body` with sensitive field values replaced
 * by `'[REDACTED]'`.
 *
 * Only processes plain objects — arrays, primitives and null are returned
 * as-is so the function never throws on unexpected input.
 *
 * @param body            - The raw `req.body` value.
 * @param extraFields     - Additional field names to redact (from `AuditMiddlewareOptions.sensitiveFields`).
 */
export function sanitizeBody(
  body: unknown,
  extraFields: string[] = []
): unknown {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return body
  }

  const fieldsToRedact = extraFields.length
    ? new Set([...DEFAULT_SENSITIVE_FIELDS, ...extraFields])
    : DEFAULT_SENSITIVE_FIELDS

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    sanitized[key] = fieldsToRedact.has(key) ? '[REDACTED]' : value
  }

  return sanitized
}
