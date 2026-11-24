import { convertBinaryMoney, roundBinaryMoney } from '@rafamedtech/nuxt-shared/utils'

export type Currency = 'MXN' | 'USD'

export const BASE_CURRENCY: Currency = 'MXN'

export function normalizeExchangeRate(currency: Currency, exchangeRate: number) {
  return currency === BASE_CURRENCY ? 1 : Number(exchangeRate)
}

export function roundMoney(value: number) {
  return roundBinaryMoney(Number(value))
}

export function convertToMxn(amount: number, currency: Currency, exchangeRate: number) {
  return convertBinaryMoney(Number(amount), normalizeExchangeRate(currency, exchangeRate))
}

export function convertFromMxn(amountMxn: number, currency: Currency, exchangeRate: number) {
  const rate = normalizeExchangeRate(currency, exchangeRate)
  return convertBinaryMoney(Number(amountMxn), rate, 'fromBase')
}
