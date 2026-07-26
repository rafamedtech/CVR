import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  crmPrisma?: PrismaClient
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw createError({
      statusCode: 503,
      statusMessage: 'DATABASE_URL no está configurada.'
    })
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000
    })
  })
}

export function usePrisma() {
  if (!globalForPrisma.crmPrisma) {
    globalForPrisma.crmPrisma = createPrismaClient()
  }

  return globalForPrisma.crmPrisma
}
