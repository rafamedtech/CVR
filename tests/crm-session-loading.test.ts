import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(
  readFileSync(new URL('../app/middleware/crm-session.global.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText

function fixture({ userId = 'consulta', existingId = '', fail = 0 } = {}) {
  const session = { value: existingId ? { profile: { id: existingId } } : null }
  let requests = 0
  const exports: { default?: (to: { path: string }) => Promise<void> } = {}
  runInNewContext(source, {
    exports,
    defineNuxtRouteMiddleware: (handler: unknown) => handler,
    useSupabaseUser: () => ({ value: userId ? { sub: userId } : null }),
    useCrmSession: () => ({ session, setSession: (value: typeof session.value) => { session.value = value } }),
    useRequestFetch: () => async () => {
      requests += 1
      if (fail) throw Object.assign(new Error('Session failed'), { statusCode: fail })
      await Promise.resolve()
      return { profile: { id: userId, isReadOnly: true }, selectedWorkshopId: null, canViewAll: true }
    },
    createError: (error: { statusCode: number, statusMessage: string }) => Object.assign(new Error(error.statusMessage), error)
  })
  return { run: exports.default!, session, requests: () => requests }
}

test('espera la sesión de consulta antes de montar la página de datos', async () => {
  const app = fixture()
  await app.run({ path: '/' })
  assert.equal(app.session.value?.profile.id, 'consulta')
  assert.equal(app.requests(), 1)
})

test('conserva la sesión cargada al navegar y evita peticiones duplicadas', async () => {
  const app = fixture({ existingId: 'consulta' })
  await app.run({ path: '/reportes' })
  assert.equal(app.requests(), 0)
})

test('descarta los permisos del usuario anterior al cambiar de cuenta', async () => {
  const app = fixture({ existingId: 'admin' })
  await app.run({ path: '/' })
  assert.equal(app.session.value?.profile.id, 'consulta')
  assert.equal(app.requests(), 1)
})

test('muestra un error de acceso cuando falla el perfil, sin renderizar la página vacía', async () => {
  const app = fixture({ existingId: 'admin', fail: 403 })
  await assert.rejects(app.run({ path: '/' }), { statusCode: 403 })
  assert.equal(app.session.value, null)
})

test('no carga el perfil en las rutas públicas ni sin sesión autenticada', async () => {
  const app = fixture()
  for (const path of ['/login', '/forgot-password', '/confirm']) await app.run({ path })
  assert.equal(app.requests(), 0)
  const signedOut = fixture({ userId: '', existingId: 'admin' })
  await signedOut.run({ path: '/' })
  assert.equal(signedOut.session.value, null)
  assert.equal(signedOut.requests(), 0)
})
