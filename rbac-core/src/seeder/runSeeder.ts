import { createAuthApi } from '../http/createAuthApi'
import rbacConfig from '../config/rbacConfig'
import type { RbacSeedEntry } from '../types'

/**
 * Fire-and-forget: sends the seed to the backend so it can create or verify
 * that all declared categories and actions exist in the database.
 *
 * Called automatically by `RbacPlugin.install()` when a `seed` is supplied.
 * Never throws and never blocks app startup.
 *
 * Backend endpoint: `POST /rbac/seed`
 * Body: `{ categories: RbacSeedEntry[] }`
 */
export async function runSeeder(seed: RbacSeedEntry[]): Promise<void> {
  if (!seed || seed.length === 0) return

  try {
    const api = createAuthApi(rbacConfig.authApiUrl)
    const response = await api.post('/rbac/seed', { categories: seed })

    if (rbacConfig.debugMode) {
      console.info(
        '[rbac-core] Seeder ran successfully. Categories synced:',
        seed.map((c) => c.name)
      )
      console.debug('[rbac-core] Seeder response:', response)
    }
  } catch (error) {
    const err = error as { message?: string } | null
    console.warn(
      '[rbac-core] Seeder failed. Categories may not exist in the DB yet.',
      err?.message ?? error
    )
  }
}
