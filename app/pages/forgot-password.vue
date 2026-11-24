<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })
useHead({ title: 'Recuperar contraseña' })

const supabase = useSupabaseClient()
const toast = useToast()
const loading = shallowRef(false)
const sent = shallowRef(false)
const state = reactive({ email: '' })
const schema = z.object({ email: z.email('Escribe un correo válido.') })

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  loading.value = true
  const redirectTo = `${window.location.origin}/confirm?recovery=1`
  const { error } = await supabase.auth.resetPasswordForEmail(event.data.email, { redirectTo })
  loading.value = false

  if (error) {
    toast.add({ title: 'No fue posible enviar el enlace', description: error.message, color: 'error' })
    return
  }

  sent.value = true
}
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-elevated/40 p-6">
    <AuthFormCard>
      <AuthRecoveryNotice
        v-if="sent"
        description="Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña."
      >
        <UButton to="/login" label="Volver al inicio de sesión" block />
      </AuthRecoveryNotice>

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <div>
          <h1 class="text-xl font-semibold text-highlighted">
            Recuperar contraseña
          </h1>
          <p class="mt-1 text-sm text-muted">
            Te enviaremos un enlace seguro.
          </p>
        </div>
        <AuthEmailField v-model="state.email" required />
        <UButton
          type="submit"
          label="Enviar enlace"
          :loading="loading"
          block
        />
        <UButton
          to="/login"
          label="Cancelar"
          color="neutral"
          variant="ghost"
          block
        />
      </UForm>
    </AuthFormCard>
  </main>
</template>
