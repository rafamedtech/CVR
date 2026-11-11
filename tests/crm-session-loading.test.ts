import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(
  readFileSync(new URL('../app/middleware/crm-session.global.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText

function fixture({ userId = 'consulta', existingId = '', fail = 0, isReadOnly = true } = {}) {
  const session = { value: existingId ? { profile: { id: existingId, isReadOnly } } : null }
  const redirects: Array<{ path: string, replace: boolean }> = []
  let requests = 0
  const exports: { default?: (to: { path: string }) => Promise<void> } = {}
  runInNewContext(source, {
    exports,
    navigateTo: (path: string, options: { replace: boolean }) => { redirects.push({ path, replace: options.replace }) },
    defineNuxtRouteMiddleware: (handler: unknown) => handler,
    useSupabaseUser: () => ({ value: userId ? { sub: userId } : null }),
    useCrmSession: () => ({ session, setSession: (value: typeof session.value) => { session.value = value } }),
    useRequestFetch: () => async () => {
      requests += 1
      if (fail) throw Object.assign(new Error('Session failed'), { statusCode: fail })
      await Promise.resolve()
      return { profile: { id: userId, isReadOnly }, selectedWorkshopId: null, canViewAll: true }
    },
    createError: (error: { statusCode: number, statusMessage: string }) => Object.assign(new Error(error.statusMessage), error)
  })
  return { run: exports.default!, session, redirects, requests: () => requests }
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

test('consulta inicia directamente en reportes después de cargar su perfil', async () => {
  const app = fixture()
  await app.run({ path: '/' })
  assert.deepEqual(app.redirects, [{ path: '/reportes', replace: true }])
})

test('consulta tampoco puede abrir Resumen con una sesión ya cargada', async () => {
  const app = fixture({ existingId: 'consulta' })
  await app.run({ path: '/' })
  assert.deepEqual(app.redirects, [{ path: '/reportes', replace: true }])
  assert.equal(app.requests(), 0)
})

test('consulta omite la selección inicial de taller y conserva su acceso global', async () => {
  const app = fixture()
  await app.run({ path: '/elegir-taller' })
  assert.deepEqual(app.redirects, [{ path: '/reportes', replace: true }])
})

test('la selección inicial carga el perfil antes de mostrar los talleres autorizados', async () => {
  const app = fixture({ userId: 'admin', existingId: 'previous-user', isReadOnly: false })
  await app.run({ path: '/elegir-taller' })
  assert.equal(app.session.value?.profile.id, 'admin')
  assert.equal(app.requests(), 1)
  assert.deepEqual(app.redirects, [])
})

test('consulta puede navegar a reportes y otras páginas sin redirecciones', async () => {
  const app = fixture({ existingId: 'consulta' })
  for (const path of ['/reportes', '/clientes', '/ordenes']) await app.run({ path })
  assert.deepEqual(app.redirects, [])
})

test('los otros perfiles mantienen Resumen como inicio', async () => {
  const app = fixture({ userId: 'admin', isReadOnly: false })
  await app.run({ path: '/' })
  assert.deepEqual(app.redirects, [])
})
