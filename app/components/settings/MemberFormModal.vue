<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { WorkshopSummary } from '~/types/crm'

const props = defineProps<{
  workshops: readonly WorkshopSummary[]
  selectedWorkshopId: string | null
  allowWorkshopSelection?: boolean
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const roleOptions = Object.entries(workshopRoleLabels).map(([value, label]) => ({ value, label }))
const schema = z.object({
  fullName: z.string().min(2, 'Escribe el nombre.'),
  email: z.email('Escribe un correo válido.'),
  phone: z.string().optional(),
  workshopId: z.string().min(1, 'Selecciona un taller.'),
  role: z.enum(['MANAGER', 'ADVISOR', 'TECHNICIAN', 'CASHIER'])
})
type MemberSchema = z.output<typeof schema>
const state = reactive<MemberSchema>({
  fullName: '',
  email: '',
  phone: '',
  workshopId: props.selectedWorkshopId ?? props.workshops[0]?.id ?? '',
  role: 'ADVISOR'
})

watch(() => props.selectedWorkshopId, (value) => {
  if (value) state.workshopId = value
})

const workshopOptions = computed(() => props.workshops.map(workshop => ({
  label: workshop.name,
  value: workshop.id
})))

async function onSubmit(event: FormSubmitEvent<MemberSchema>) {
  loading.value = true
  try {
    const result = await $fetch<{ invited: boolean }>('/api/members', { method: 'POST', body: event.data })
    toast.add({
      title: result.invited ? 'Invitación enviada' : 'Permisos actualizados',
      description: result.invited ? 'El usuario recibirá un enlace para definir su contraseña.' : undefined,
      color: 'success'
    })
    open.value = false
    emit('created')
  } catch (error) {
    toast.add({ title: 'No se pudo agregar el usuario', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Invitar usuario"
    description="El acceso se activa mediante un enlace seguro enviado por correo."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="member-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField name="fullName" label="Nombre completo" required>
          <UInput v-model="state.fullName" class="w-full" />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField name="email" label="Correo electrónico" required>
            <UInput v-model="state.email" type="email" class="w-full" />
          </UFormField>
          <UFormField name="phone" label="Teléfono">
            <UInput v-model="state.phone" class="w-full" />
          </UFormField>
        </div>
        <UFormField name="workshopId" label="Taller" required>
          <USelect
            v-model="state.workshopId"
            :items="workshopOptions"
            value-key="value"
            class="w-full"
            :disabled="!allowWorkshopSelection && Boolean(selectedWorkshopId)"
          />
        </UFormField>
        <UFormField name="role" label="Rol" required>
          <USelect
            v-model="state.role"
            :items="roleOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UAlert
          title="Los permisos se aplican por taller"
          description="Un mismo usuario podrá agregarse después a otros negocios con un rol diferente."
          icon="i-lucide-shield-check"
          color="info"
          variant="subtle"
        />
      </UForm>
    </template>
    <template #footer="{ close }">
      <UButton
        label="Cancelar"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        type="submit"
        form="member-form"
        label="Enviar invitación"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
