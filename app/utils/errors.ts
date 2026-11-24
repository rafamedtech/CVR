import { readApiErrorMessage } from '@rafamedtech/nuxt-shared/utils'

export function getApiErrorMessage(error: unknown) {
  return readApiErrorMessage(error) ?? 'Ocurrió un error inesperado.'
}
