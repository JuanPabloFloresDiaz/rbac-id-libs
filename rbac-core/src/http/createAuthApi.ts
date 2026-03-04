import axios, { type AxiosInstance } from 'axios'
import type { ApiError } from '../types'

/**
 * Creates an Axios instance pre-configured for the auth API.
 *
 * Response interceptor unwraps `.data` so every caller receives the
 * payload directly without touching the Axios response envelope.
 *
 * @param baseURL - The auth API base URL (from `rbacConfig.authApiUrl`).
 */
export function createAuthApi(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  instance.interceptors.response.use(
    (response) => response.data,
    (error) => {
      const message: string =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An error occurred'

      const apiError: ApiError = {
        status: error.response?.status as number | undefined,
        message,
        originalError: error
      }

      return Promise.reject(apiError)
    }
  )

  return instance
}
