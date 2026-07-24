import { z } from 'zod'

export const taxRateValues = [0, 8, 16] as const

export const taxRateSchema = z.coerce.number().refine(
  value => taxRateValues.includes(value as typeof taxRateValues[number]),
  'Selecciona una tasa de IVA válida.'
)
