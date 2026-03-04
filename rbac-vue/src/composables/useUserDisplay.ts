import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../store/useAuthStore'

/**
 * Exposes display-ready values derived from the authenticated user's `userData`.
 *
 * Usage:
 * ```ts
 * const { formattedName, initials, userTypeLabel } = useUserDisplay()
 * ```
 * ```html
 * <v-list-item-title>{{ formattedName }}</v-list-item-title>
 * <v-avatar>{{ initials }}</v-avatar>
 * <v-list-item-subtitle>{{ userTypeLabel }}</v-list-item-subtitle>
 * ```
 */
export function useUserDisplay() {
  const authStore = useAuthStore()
  const { userData, isAuthenticated } = storeToRefs(authStore)

  /** "First word of first_name + first word of last_name" → "Oscar Pérez" */
  const formattedName = computed<string>(() => {
    const firstName = (userData.value?.first_name ?? '').split(' ')[0]
    const firstSurname = (userData.value?.last_name ?? '').split(' ')[0]
    return [firstName, firstSurname].filter(Boolean).join(' ') || '—'
  })

  /** Full concatenated name: `first_name + last_name` */
  const fullName = computed<string>(() => {
    const parts = [userData.value?.first_name, userData.value?.last_name]
    return parts.filter(Boolean).join(' ') || '—'
  })

  /** Up to 2-character initials → "OP" */
  const initials = computed<string>(() => {
    const first = (userData.value?.first_name ?? '').charAt(0).toUpperCase()
    const last = (userData.value?.last_name ?? '').charAt(0).toUpperCase()
    return [first, last].filter(Boolean).join('') || '?'
  })

  /** Human-readable role/type label from `userData.user_type`. */
  const userTypeLabel = computed<string>(() => userData.value?.user_type ?? '')

  const userEmail = computed<string | null>(() => userData.value?.email ?? null)
  const userId = computed<string | number | null>(() => userData.value?.id ?? null)

  return {
    formattedName,
    fullName,
    initials,
    userTypeLabel,
    userEmail,
    userId,
    isAuthenticated
  }
}
