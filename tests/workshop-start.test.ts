import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(
  readFileSync(new URL('../app/composables/useCrmSession.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText

function fixture() {
  const cookie = { value: 'previous-workshop' }
  const reloads: Array<{ force: boolean, path?: string }> = []
  const exports: { useCrmSession?: () => { selectWorkshop: (id: string | null, path?: string) => Promise<void> } } = {}
  runInNewContext(source, {
    exports,
    useState: () => ({ value: null }),
    computed: (getter: () => unknown) => ({ get value() { return getter() } }),
    readonly: (value: unknown) => value,
    useCookie: () => cookie,
    reloadNuxtApp: async (options: { force: boolean, path?: string }) => {
      // The cookie must be set before the reload so the first dashboard request is scoped.
      assert.notEqual(cookie.value, 'previous-workshop')
      reloads.push({ ...options })
    }
  })
  return { ...exports.useCrmSession!(), cookie, reloads }
}

for (const id of ['body-shop', 'mechanical']) {
  test(`inicia en ${id} reemplazando la vista previa antes de abrir el resumen`, async () => {
    const app = fixture()
    await app.selectWorkshop(id, '/')
    assert.equal(app.cookie.value, id)
    assert.deepEqual(app.reloads, [{ force: true, path: '/' }])
  })
}

test('el selector habitual conserva la página y permite volver a la vista consolidada', async () => {
  const app = fixture()
  await app.selectWorkshop(null)
  assert.equal(app.cookie.value, 'all')
  assert.deepEqual(app.reloads, [{ force: true }])
})
