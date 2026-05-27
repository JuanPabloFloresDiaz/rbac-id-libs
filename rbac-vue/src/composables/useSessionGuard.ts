import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/useAuthStore'
import { rbacConfig } from '@oscardevpr/rbac-core'

/**
 * Verifies the active session on mount and redirects when it is invalid.
 *
 * Place in `App.vue` to protect the whole application:
 * ```ts
 * useSessionGuard(undefined, (err) => toast(err.message))
 * ```
 *
 * Or in a specific layout component so it only runs for that layout.
 */
export function useSessionGuard(
  redirectTo?: string,
  onError?: (err: unknown) => void
) {
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
