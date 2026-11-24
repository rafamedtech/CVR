import { resolveValidationResult } from '@rafamedtech/nuxt-shared/utils'
import type { H3Event } from 'h3'
import type { ZodType } from 'zod'

export async function readCrmBody<T>(event: H3Event, schema: ZodType<T>) {
  const result = resolveValidationResult(schema.safeParse(await readBody(event)), 'Los datos enviados no son válidos.')

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.message
    })
  }

  return result.data
}
