import type { Permission } from '../types'

/**
 * Core permission checking logic — pure functions, no side-effects, no deps.
 *
 * Both functions delegate the debugMode bypass first so callers never need to
 * check it themselves.
 */

/**
 * Returns `true` when the user has `action` inside the given `category`.
 *
 * @param permissions - Flat list from the store / auth API.
 * @param category    - The category (module) to scope the lookup to.
 * @param action      - The exact action string to find.
 * @param debugMode   - When `true` always returns `true` (dev bypass).
 */
export function checkPermission(
  permissions: Permission[],
  category: string,
  action: string,
  debugMode = false
): boolean {
  if (debugMode) return true
  if (!permissions || !Array.isArray(permissions)) return false
  if (!category || !action) return false

  const entry = permissions.find((p) => p.category === category)
  if (!entry) return false

  return entry.actions.includes(action)
}

/**
 * Returns `true` when the user has `action` in *any* category.
 * Use when a permission is not scoped to a specific module.
 *
 * @param permissions - Flat list from the store / auth API.
 * @param action      - The exact action string to find.
 * @param debugMode   - When `true` always returns `true` (dev bypass).
 */
export function checkPermissionAny(
  permissions: Permission[],
  action: string,
  debugMode = false
): boolean {
  if (debugMode) return true
  if (!permissions || !Array.isArray(permissions)) return false
  if (!action) return false

  return permissions.some((entry) => entry.actions.includes(action))
}
