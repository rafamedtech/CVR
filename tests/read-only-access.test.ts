import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const authSource = ts.transpileModule(
  readFileSync(new URL('../server/utils/auth.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText

function authFixture(role = 'READ_ONLY', isSuperAdmin = false) {
  const workshop = { id: 'body-shop', active: true }
  const profile = {
    id: 'user-id',
    active: true,
    isSuperAdmin,
    memberships: [{ workshopId: workshop.id, role, workshop }]
  }
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {}
  runInNewContext(authSource, {
    exports,
    require: () => ({ serverSupabaseUser: async () => ({ sub: profile.id, email: 'consulta@cvrtransportinc.com' }) }),
    usePrisma: () => ({
      profile: { findUnique: async () => profile },
      workshop: { findFirst: async () => workshop }
    }),
    getCookie: () => workshop.id,
    createError: (error: { statusCode: number, statusMessage: string }) => Object.assign(new Error(error.statusMessage), error)
  })
  return exports.requireCrmUser!
}

for (const method of ['GET', 'HEAD', 'OPTIONS']) {
  test(`consulta puede leer con ${method}`, async () => {
    const context = await authFixture()({ method }) as { workshopId: string, isSuperAdmin: boolean }
    assert.equal(context.workshopId, 'body-shop')
    assert.equal(context.isSuperAdmin, false)
  })
}

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
  test(`consulta recibe 403 al intentar ${method}`, async () => {
    await assert.rejects(authFixture()({ method }), { statusCode: 403 })
  })
}

test('el rol de consulta se evalúa desde la membresía guardada, no desde la petición', async () => {
  await assert.rejects(authFixture()({ method: 'POST', role: 'MANAGER', isSuperAdmin: true }), { statusCode: 403 })
})

test('conserva el acceso de escritura de los roles existentes y del administrador', async () => {
  for (const role of ['MANAGER', 'ADVISOR', 'TECHNICIAN', 'CASHIER']) {
    await assert.doesNotReject(authFixture(role)({ method: 'POST' }))
  }
  await assert.doesNotReject(authFixture('READ_ONLY', true)({ method: 'POST' }))
})
