import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/useAuthStore'
import { rbacConfig } from '@oscardevpr/rbac-core'
import type { ApiError } from '@oscardevpr/rbac-core'

/**
 * Wraps `authStore.logOut()` with automatic redirect and optional lifecycle hooks.
 *
 * Handles the 403 edge case (session already expired) by also redirecting,
 * which is the correct behavior for an expired session.
 *
 * Usage:
 * ```ts
 * const { logOut } = useLogout(
 *   undefined,
 *   (data) => toast({ icon: 'success', title: data.message }),
 *   (err)  => toast({ icon: 'error',   title: err.message })
 * )
 * ```
 */
export function useLogout(
  redirectTo?: string,
  onSuccess?: (data: unknown) => void,
  onError?: (err: ApiError) => void
) {
  const authStore = useAuthStore()
  const router = useRouter()

  const target = redirectTo ?? rbacConfig.loginRoute ?? 'login'

  const logOut = async (): Promise<void> => {
    try {
      const data = await authStore.logOut()
      if (typeof onSuccess === 'function') onSuccess(data)
      router.push({ name: target })
    } catch (err) {
      const apiErr = err as ApiError
      if (typeof onError === 'function') {
        onError(apiErr)
      } else {
        console.error('[rbac-vue] Logout failed:', apiErr)
      }
      // Always redirect on an expired/forbidden session
      if (!apiErr || apiErr.status === 403 || rbacConfig.debugMode) {
        router.push({ name: target })
      }
    }
  }

  return { logOut }
}
