export { normalizePhone } from '@rafamedtech/nuxt-shared/utils'

export const UNKNOWN_PHONE = '0000000000'

export function isIdentifyingPhone(value: string) {
  return value !== UNKNOWN_PHONE
}
