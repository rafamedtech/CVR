import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const authSource = ts.transpileModule(
  readFileSync(new URL('../server/utils/auth.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText

function authModuleFixture(role = 'READ_ONLY', isSuperAdmin = false, isReadOnly = false, selected = 'body-shop') {
  const workshop = { id: 'body-shop', active: true }
  const profile = {
    id: 'user-id',
    active: true,
    isSuperAdmin,
    isReadOnly,
    memberships: isReadOnly ? [] : [{ workshopId: workshop.id, role, workshop }]
  }
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {}
  runInNewContext(authSource, {
    exports,
    require: () => ({ serverSupabaseUser: async () => ({ sub: profile.id, email: 'consulta@cvrtransportinc.com' }) }),
    usePrisma: () => ({
      profile: { findUnique: async () => profile },
      workshop: { findFirst: async () => workshop }
    }),
    getCookie: () => selected,
    createError: (error: { statusCode: number, statusMessage: string }) => Object.assign(new Error(error.statusMessage), error)
  })
  return exports
}

function authFixture(role = 'READ_ONLY', isSuperAdmin = false) {
  return authModuleFixture(role, isSuperAdmin).requireCrmUser!
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

for (const selected of ['body-shop', 'mechanical', 'all', '']) {
  test(`consulta global ve todos los talleres incluso con selección previa: ${selected || 'sin cookie'}`, async () => {
    const auth = authModuleFixture('READ_ONLY', false, true, selected)
    const context = await auth.requireCrmUser!({ method: 'GET' }) as { workshopId: string | null, selectedWorkshop: unknown, isReadOnly: boolean, isSuperAdmin: boolean }
    assert.equal(context.workshopId, null)
    assert.equal(context.selectedWorkshop, null)
    assert.equal(context.isReadOnly, true)
    assert.equal(context.isSuperAdmin, false)
    assert.equal(JSON.stringify(auth.workshopWhere!(context)), '{}')
    assert.equal(JSON.stringify(auth.customerAccessWhere!(context)), '{}')
    assert.equal(JSON.stringify(auth.vehicleAccessWhere!(context)), '{}')
    assert.equal(JSON.stringify(auth.assignedOrderWhere!(context)), '{}')
    assert.doesNotThrow(() => auth.requireGlobalReadAccess!(context))
    assert.doesNotThrow(() => auth.requireWorkshopRole!(context, ['MANAGER', 'CASHIER', 'READ_ONLY']))
    assert.throws(() => auth.requireSuperAdmin!(context), { statusCode: 403 })
    assert.throws(() => auth.requireWorkshopRole!(context, ['MANAGER']), { statusCode: 403 })
  })
}

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
  test(`consulta global sin membresías bloquea ${method}`, async () => {
    await assert.rejects(authModuleFixture('READ_ONLY', false, true).requireCrmUser!({ method }), { statusCode: 403 })
  })
}

test('un rol local no obtiene acceso a los reportes globales', async () => {
  const auth = authModuleFixture('MANAGER')
  const context = await auth.requireCrmUser!({ method: 'GET' })
  assert.throws(() => auth.requireGlobalReadAccess!(context), { statusCode: 403 })
})
