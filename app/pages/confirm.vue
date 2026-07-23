<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })
useHead({ title: 'Configurar contraseña' })

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const checking = shallowRef(true)
const ready = shallowRef(false)
const saving = shallowRef(false)
const message = shallowRef('')
const state = reactive({ password: '', confirmation: '' })
const schema = z.object({
  password: z.string().min(8, 'Usa al menos 8 caracteres.'),
  confirmation: z.string()
}).refine(value => value.password === value.confirmation, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmation']
})

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : null
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      message.value = 'El enlace expiró o ya fue utilizado. Solicita uno nuevo.'
      checking.value = false
      return
    }
  }

  const { data } = await supabase.auth.getSession()
  ready.value = Boolean(data.session)
  if (!ready.value) {
    message.value = 'No encontramos una sesión válida para este enlace.'
  }
  checking.value = false
})

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  saving.value = true
  const { error } = await supabase.auth.updateUser({ password: event.data.password })
  saving.value = false

  if (error) {
    toast.add({ title: 'No se pudo guardar la contraseña', description: error.message, color: 'error' })
    return
  }

  toast.add({ title: 'Contraseña guardada', color: 'success' })
  await navigateTo('/')
}
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-elevated/40 p-6">
    <UPageCard class="w-full max-w-md">
      <div v-if="checking" class="flex items-center justify-center gap-3 py-10 text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        Validando enlace…
      </div>

      <UAlert
        v-else-if="!ready"
        title="No se pudo abrir el enlace"
        :description="message"
        icon="i-lucide-circle-alert"
        color="error"
        variant="subtle"
        :actions="[{ label: 'Ir al inicio de sesión', to: '/login' }]"
      />

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <div>
          <h1 class="text-xl font-semibold text-highlighted">
            Define tu contraseña
          </h1>
          <p class="mt-1 text-sm text-muted">
            Se utilizará para ingresar al Control de Talleres.
          </p>
        </div>
        <UFormField name="password" label="Nueva contraseña" required>
          <UInput v-model="state.password" type="password" class="w-full" />
        </UFormField>
        <UFormField name="confirmation" label="Confirmar contraseña" required>
          <UInput v-model="state.confirmation" type="password" class="w-full" />
        </UFormField>
        <UButton
          type="submit"
          label="Guardar contraseña"
          :loading="saving"
          block
        />
      </UForm>
    </UPageCard>
  </main>
</template>
