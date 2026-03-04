import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/useAuthStore'
import { rbacConfig } from '@oscardevpr/rbac-core'

export interface SessionGuardOptions {
  /** Route name to redirect to on failure. Falls back to `rbacConfig.loginRoute`. */
  redirectTo?: string
  /**
   * Optional hook invoked with the error before any redirect.
   * Use it to show a toast / snackbar without coupling this composable
   * to a specific notification library.
   */
  onError?: (err: unknown) => void
}

/**
 * Verifies the active session on mount and redirects when it is invalid.
 *
 * Place in `App.vue` to protect the whole application:
 * ```ts
 * useSessionGuard({ onError: (err) => toast(err.message) })
 * ```
 *
 * Or in a specific layout component so it only runs for that layout.
 */
export function useSessionGuard(options: SessionGuardOptions = {}) {
  const { redirectTo, onError } = options
  const authStore = useAuthStore()
  const router = useRouter()

  const verifySession = async (): Promise<void> => {
    try {
      await authStore.checkAuth()
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err)
      } else {
        console.error('[rbac-vue] Session verification failed:', err)
      }

      if (rbacConfig.debugMode) return

      const target = redirectTo ?? rbacConfig.loginRoute ?? 'login'
      router.push({ name: target })
    }
  }

  onMounted(() => { verifySession() })

  return { verifySession }
}
