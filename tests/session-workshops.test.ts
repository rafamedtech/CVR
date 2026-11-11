import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(
  readFileSync(new URL('../server/api/session.get.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText

for (const email of ['rafamed.tech@gmail.com', 'admin@cvrtransportinc.com']) {
  test(`${email}: el superadministrador recibe ambos talleres sin depender de membresías`, async () => {
    const workshops = [
      { id: 'body-shop', name: 'Taller de Carrocería', type: 'BODY_SHOP', taxRate: 8 },
      { id: 'mechanical', name: 'Taller Mecánico', type: 'MECHANICAL', taxRate: 8 }
    ]
    const exports: { default?: (event: unknown) => Promise<{ workshops: Array<{ id: string }>, canViewAll: boolean, profile: { isSuperAdmin: boolean } }> } = {}
    runInNewContext(source, {
      exports,
      defineEventHandler: (handler: unknown) => handler,
      requireCrmUser: async () => ({
        profile: { id: 'admin-id', email, fullName: 'Administrador', memberships: [] },
        isSuperAdmin: true,
        isReadOnly: false,
        workshopId: null,
        selectedWorkshop: null
      }),
      usePrisma: () => ({ workshop: { findMany: async (query: { where: { active: boolean } }) => {
        assert.equal(query.where.active, true)
        return workshops
      } } })
    })
    const session = await exports.default!({})
    assert.equal(session.profile.isSuperAdmin, true)
    assert.equal(session.canViewAll, true)
    assert.deepEqual(Array.from(session.workshops, item => item.id), ['body-shop', 'mechanical'])
  })
}
