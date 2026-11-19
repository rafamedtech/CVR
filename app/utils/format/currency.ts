import type { Currency } from '~/types/crm'
import { createCurrencyFormatter, reportCurrency } from '@rafamedtech/nuxt-shared/utils'

const currencyFormatters: Record<Currency, Intl.NumberFormat> = {
  MXN: reportCurrency,
  USD: createCurrencyFormatter('USD', { maximumFractionDigits: 2 })
}

export function formatCurrency(value: number | null | undefined, currency: Currency = 'MXN') {
  if (value === null || value === undefined) return '—'

  return currencyFormatters[currency].format(value)
}
