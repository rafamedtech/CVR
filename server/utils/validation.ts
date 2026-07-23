import type { H3Event } from 'h3'
import type { ZodType } from 'zod'

export async function readCrmBody<T>(event: H3Event, schema: ZodType<T>) {
  const result = schema.safeParse(await readBody(event))

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error.issues[0]?.message ?? 'Los datos enviados no son válidos.'
    })
  }

  return result.data
}
