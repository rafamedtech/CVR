export const UNKNOWN_PHONE = '0000000000'

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 10)
}

export function isIdentifyingPhone(value: string) {
  return value !== UNKNOWN_PHONE
}
