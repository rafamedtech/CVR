<script setup lang="ts">
import { z } from 'zod'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })
useHead({ title: 'Iniciar sesión' })

const supabase = useSupabaseClient()
const toast = useToast()
const loading = shallowRef(false)

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Correo electrónico',
  placeholder: 'nombre@empresa.com',
  required: true
}, {
  name: 'password',
  type: 'password',
  label: 'Contraseña',
  placeholder: 'Tu contraseña',
  required: true
}]

const schema = z.object({
  email: z.email('Escribe un correo válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.')
})

type LoginSchema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  loading.value = true
  const { error } = await supabase.auth.signInWithPassword(event.data)
  loading.value = false

  if (error) {
    toast.add({
      title: 'No pudimos iniciar sesión',
      description: 'Revisa tu correo y contraseña.',
      color: 'error'
    })
    return
  }

  await navigateTo('/')
}
</script>

<template>
  <main class="grid min-h-dvh lg:grid-cols-2">
    <section class="hidden bg-elevated p-12 lg:flex lg:flex-col lg:justify-between">
      <div class="flex items-center gap-3 text-highlighted">
        <div class="flex size-11 items-center justify-center rounded-xl bg-primary text-inverted">
          <UIcon name="i-lucide-gauge" class="size-6" />
        </div>
        <span class="text-lg font-semibold">Control de Talleres</span>
      </div>

      <div class="max-w-lg">
        <UBadge label="Operación clara, decisiones rápidas" variant="subtle" />
        <h1 class="mt-5 text-4xl font-semibold tracking-tight text-highlighted">
          Todo lo importante de tus talleres, en un solo lugar.
        </h1>
        <p class="mt-4 text-lg text-muted">
          Órdenes, clientes, vehículos, cobros, gastos y resultados separados por negocio.
        </p>
      </div>

      <p class="text-sm text-muted">
        Acceso exclusivo para usuarios invitados.
      </p>
    </section>

    <section class="flex items-center justify-center p-6 sm:p-10">
      <UPageCard class="w-full max-w-md">
        <UAuthForm
          :schema="schema"
          :fields="fields"
          :submit="{ label: loading ? 'Ingresando…' : 'Iniciar sesión', loading, block: true }"
          title="Bienvenido"
          description="Ingresa con el usuario asignado por el administrador."
          icon="i-lucide-lock-keyhole"
          @submit="onSubmit"
        >
          <template #password-hint>
            <ULink to="/forgot-password" class="font-medium text-primary">
              ¿Olvidaste tu contraseña?
            </ULink>
          </template>
        </UAuthForm>
      </UPageCard>
    </section>
  </main>
</template>
