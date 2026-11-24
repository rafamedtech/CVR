import type { Currency } from '~/types/crm'
import { formatCurrencyAmount } from '@rafamedtech/nuxt-shared/utils'

export function formatCurrency(value: number | null | undefined, currency: Currency = 'MXN') {
  return formatCurrencyAmount(value, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
