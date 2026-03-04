import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/useAuthStore'
import { rbacConfig } from '@oscardevpr/rbac-core'
import type { ApiError } from '@oscardevpr/rbac-core'

export interface LogoutOptions {
  /** Route name to redirect to after logout. Falls back to `rbacConfig.loginRoute`. */
  redirectTo?: string
  /** Called with the server response when logout succeeds. */
  onSuccess?: (data: unknown) => void
  /**
   * Called with the error when logout fails.
   * The redirect still happens on `403` even without this handler.
   */
  onError?: (err: ApiError) => void
}

/**
 * Wraps `authStore.logOut()` with automatic redirect and optional lifecycle hooks.
 *
 * Handles the 403 edge case (session already expired) by also redirecting,
 * which is the correct behavior for an expired session.
 *
 * Usage:
 * ```ts
 * const { logOut } = useLogout({
 *   onSuccess: (data) => toast({ icon: 'success', title: data.message }),
 *   onError:   (err)  => toast({ icon: 'error',   title: err.message }),
 * })
 * ```
 */
export function useLogout(options: LogoutOptions = {}) {
  const { redirectTo, onSuccess, onError } = options
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
