import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const actorId = '11111111-1111-1111-1111-111111111111'
const targetId = '22222222-2222-2222-2222-222222222222'
const workshop = { id: 'workshop', active: true }
const actor = { id: actorId, email: 'rafamed.tech@gmail.com', fullName: 'Rafael', active: true, isSuperAdmin: true, isReadOnly: false, memberships: [] }
const target = { ...actor, id: targetId, email: 'tecnico@example.com', isSuperAdmin: false, memberships: [{ workshopId: workshop.id, workshop, role: 'TECHNICIAN' }] }

function setup(options: { actor?: typeof actor, target?: typeof target | null, method?: string } = {}) {
  const authenticated = options.actor ?? actor
  const selected = options.target === undefined ? target : options.target
  const cookies: Record<string, string> = { 'crm-user-switch': targetId }
  const exports = {} as {
    requireCrmUser: (event: unknown) => Promise<{
      profile: { id: string }
      userSwitch?: { id: string }
      workshopId: string | null
      isSuperAdmin: boolean
    }>
    canSwitchCrmUsers: (profile: typeof actor) => boolean
    requireSuperAdmin: (context: unknown) => void
    assignedOrderWhere: (context: unknown) => { assignedToId?: string }
    default: (event: unknown) => Promise<unknown>
  }
  const globals = {
    exports,
    require: () => ({ serverSupabaseUser: async () => ({ sub: authenticated.id, email: authenticated.email }) }),
    createError: (error: object) => Object.assign(new Error(), error),
    getCookie: (_event: unknown, name: string) => cookies[name],
    deleteCookie: (_event: unknown, name: string) => { Reflect.deleteProperty(cookies, name) },
    setCookie: (_event: unknown, name: string, value: string) => { cookies[name] = value },
    usePrisma: () => ({ profile: {
      findUnique: async ({ where }: { where: { id: string } }) => where.id === actorId ? authenticated : selected,
      findFirst: async () => selected?.active ? selected : null
    } }),
    process: { env: {} }
  }
  function evaluate(path: string, extra = {}) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8').replaceAll('import.meta.dev', 'true')
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    runInNewContext(output, { ...globals, ...extra })
  }
  evaluate('../server/utils/auth.ts')
  const event = { method: options.method ?? 'GET' }
  return { exports, cookies, event, evaluate }
}

test('Rafael cambia al técnico y recibe su taller y restricciones', async () => {
  const { exports, event } = setup()
  const context = await exports.requireCrmUser!(event)
  assert.equal(context.profile.id, targetId)
  assert.equal(context.userSwitch?.id, actorId)
  assert.equal(context.workshopId, workshop.id)
  assert.equal(context.isSuperAdmin, false)
  assert.throws(() => exports.requireSuperAdmin!(context), { statusCode: 403 })
  assert.equal(exports.assignedOrderWhere!(context).assignedToId, targetId)
})

test('otro administrador no puede usar una cookie para cambiar de usuario', async () => {
  const { exports, event } = setup({ actor: { ...actor, email: 'otro@example.com' } })
  const context = await exports.requireCrmUser!(event)
  assert.equal(context.profile.id, actorId)
  assert.equal(context.userSwitch, undefined)
})

test('la cuenta autorizada debe conservar el permiso de administrador', () => {
  const { exports } = setup()
  assert.equal(exports.canSwitchCrmUsers!({ ...actor, isSuperAdmin: false }), false)
  assert.equal(exports.canSwitchCrmUsers!({ ...actor, active: false }), false)
})

test('el perfil de sólo lectura bloquea escrituras', async () => {
  const { exports, event } = setup({ target: { ...target, isReadOnly: true }, method: 'POST' })
  await assert.rejects(exports.requireCrmUser!(event), { statusCode: 403 })
})

test('un perfil desactivado o eliminado regresa a Rafael', async () => {
  for (const selected of [null, { ...target, active: false }]) {
    const { exports, cookies, event } = setup({ target: selected })
    assert.equal((await exports.requireCrmUser!(event)).profile.id, actorId)
    assert.equal(cookies['crm-user-switch'], undefined)
  }
})

for (const email of ['rafamed.tech@gmail.com', 'otro@example.com']) {
  test(`endpoint de cambio valida la cuenta original: ${email}`, async () => {
    const { exports, cookies, event, evaluate } = setup({ actor: { ...actor, email }, target: { ...target, isReadOnly: true }, method: 'PUT' })
    evaluate('../server/api/session-user.put.ts', {
      requireCrmUser: exports.requireCrmUser,
      canSwitchCrmUsers: exports.canSwitchCrmUsers,
      defineEventHandler: (handler: unknown) => handler,
      readBody: async () => ({ profileId: null })
    })
    if (email === actor.email) {
      await exports.default!(event)
      assert.equal(cookies['crm-user-switch'], undefined)
    } else {
      await assert.rejects(exports.default!(event), { statusCode: 403 })
      assert.equal(cookies['crm-user-switch'], targetId)
    }
  })
}

test('el endpoint rechaza identificadores inválidos y usuarios inactivos', async () => {
  for (const [profileId, statusCode] of [['invalid', 400], [targetId, 404]] as const) {
    const { exports, event, evaluate } = setup({ target: null, method: 'PUT' })
    evaluate('../server/api/session-user.put.ts', {
      requireCrmUser: exports.requireCrmUser,
      canSwitchCrmUsers: exports.canSwitchCrmUsers,
      defineEventHandler: (handler: unknown) => handler,
      readBody: async () => ({ profileId })
    })
    await assert.rejects(exports.default!(event), { statusCode })
  }
})
