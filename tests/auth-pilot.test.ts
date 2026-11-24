import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { computed, reactive, shallowRef } from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import * as vue from 'vue'
import * as zod from 'zod'
import type { DropdownMenuItem } from '@nuxt/ui'

function loadSetup<Result>(path: string, dependencies: Record<string, unknown>): Result {
  const url = new URL(path, import.meta.url)
  const { descriptor } = parse(readFileSync(url, 'utf8'), { filename: path })
  const { content } = compileScript(descriptor, { id: path })
  const { outputText } = ts.transpileModule(content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  })

  const exports: { default?: { setup: (props: object, context: { expose: () => void }) => Result } } = {}
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      if (name === 'vue') return vue
      if (name === 'zod') return zod
      throw new Error(`Importación inesperada: ${name}`)
    },
    computed,
    reactive,
    shallowRef,
    definePageMeta: () => {},
    useHead: () => {},
    ...dependencies
  })
  return exports.default!.setup({}, { expose: () => {} })
}

test('CVR permite alternar tema y cierra la sesión de Supabase y del CRM antes de navegar', async () => {
  const calls: string[] = []
  const colorMode = reactive({ value: 'light', preference: 'light' })
  const session = shallowRef({ profile: { fullName: 'Ana Ruiz', isSuperAdmin: false } })
  const isReadOnly = shallowRef(false)
  const { items, identityItems, initials } = loadSetup<{
    items: vue.ComputedRef<DropdownMenuItem[][]>
    identityItems: vue.ComputedRef<DropdownMenuItem[]>
    initials: vue.ComputedRef<string>
  }>('../app/components/UserMenu.vue', {
    useColorMode: () => colorMode,
    useCrmSession: () => ({
      session,
      isReadOnly,
      setSession: (value: null) => {
        assert.equal(value, null)
        calls.push('clear')
      }
    }),
    useUserSwitch: () => ({
      switchItems: shallowRef([{ label: 'Cambiar usuario' }]),
      loadUsers: () => {},
      switching: shallowRef(false)
    }),
    useSupabaseClient: () => ({ auth: { signOut: async () => { calls.push('signOut') } } }),
    navigateTo: async (path: string) => { calls.push(path) }
  })

  assert.equal(initials.value, 'AR')
  assert.equal(identityItems.value[0]?.label, 'Usuario de taller')
  assert.ok(items.value.flat().some(item => item.label === 'Cambiar usuario'))
  assert.ok(items.value.flat().some(item => item.to === '/configuracion'))
  await items.value.flat().find(item => item.label === 'Usar tema oscuro')!.onSelect!(new Event('select'))
  assert.equal(colorMode.preference, 'dark')
  colorMode.value = 'dark'
  await items.value.flat().find(item => item.label === 'Usar tema claro')!.onSelect!(new Event('select'))
  assert.equal(colorMode.preference, 'light')

  isReadOnly.value = true
  assert.equal(identityItems.value[0]?.label, 'Sólo lectura')
  assert.ok(items.value.flat().every(item => item.to !== '/configuracion'))

  await items.value.flat().find(item => item.label === 'Cerrar sesión')!.onSelect!(new Event('select'))
  assert.deepEqual(calls, ['signOut', 'clear', '/login'])
})

test('CVR informa el error de acceso y abre el selector de taller al ingresar', async () => {
  const data = { email: 'ana@example.test', password: 'prueba-123' }
  const redirects: string[] = []
  const errors: string[] = []
  let error: Error | null = new Error('Acceso rechazado')
  const { onSubmit, loading } = loadSetup<{
    onSubmit: (event: { data: typeof data }) => Promise<void>
    loading: vue.ShallowRef<boolean>
  }>('../app/pages/login.vue', {
    useSupabaseClient: () => ({
      auth: {
        signInWithPassword: async (credentials: typeof data) => {
          assert.equal(credentials, data)
          return { error }
        }
      }
    }),
    useToast: () => ({ add: (toast: { title: string }) => { errors.push(toast.title) } }),
    navigateTo: async (path: string) => { redirects.push(path) }
  })

  const request = onSubmit({ data })
  assert.equal(loading.value, true)
  await request
  assert.equal(loading.value, false)
  assert.deepEqual(errors, ['No pudimos iniciar sesión'])
  assert.deepEqual(redirects, [])

  error = null
  await onSubmit({ data })
  assert.deepEqual(redirects, ['/elegir-taller'])
})

test('CVR conserva el callback y el estado de confirmación al solicitar recuperación', async () => {
  const request = Promise.withResolvers<{ error: null }>()
  const { onSubmit, sent, loading } = loadSetup<{
    onSubmit: (event: { data: { email: string } }) => Promise<void>
    sent: vue.ShallowRef<boolean>
    loading: vue.ShallowRef<boolean>
  }>('../app/pages/forgot-password.vue', {
    window: { location: { origin: 'https://cvr.example.test' } },
    useSupabaseClient: () => ({
      auth: {
        resetPasswordForEmail: (email: string, options: { redirectTo: string }) => {
          assert.equal(email, 'ana@example.test')
          assert.equal(options.redirectTo, 'https://cvr.example.test/confirm?recovery=1')
          return request.promise
        }
      }
    }),
    useToast: () => ({})
  })

  const attempt = onSubmit({ data: { email: 'ana@example.test' } })
  assert.equal(loading.value, true)
  assert.equal(sent.value, false)
  request.resolve({ error: null })
  await attempt
  assert.equal(loading.value, false)
  assert.equal(sent.value, true)
})
