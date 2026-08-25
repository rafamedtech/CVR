import { z } from 'zod'

export const paymentMutationSchema = z.object({
  amount: z.coerce.number().positive('El pago debe ser mayor a cero.'),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  exchangeRate: z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.').default(1),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'CREDIT', 'OTHER']),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  paidAt: z.string().datetime({ local: true }).optional().nullable()
})

export const paymentFormSchema = paymentMutationSchema.extend({
  reference: z.string().trim().max(100),
  notes: z.string().trim().max(500),
  paidAt: z.string()
    .min(1, 'Selecciona la fecha del pago.')
    .datetime({ local: true })
})

export type PaymentMutation = z.output<typeof paymentMutationSchema>
export type PaymentForm = z.output<typeof paymentFormSchema>
