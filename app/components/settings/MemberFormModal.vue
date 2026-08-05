<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  MemberAccessPreset,
  MemberAccessType,
  WorkshopSummary
} from '~/types/crm'

const responsiveControlSize = useResponsiveControlSize()
const props = defineProps<{
  workshops: readonly WorkshopSummary[]
  selectedWorkshopId: string | null
  allowWorkshopSelection?: boolean
  allowSuperAdmin?: boolean
  preset?: MemberAccessPreset | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const roleOptions = Object.entries(workshopRoleLabels).map(([value, label]) => ({ value, label }))
const accessTypeOptions = [
  { value: 'WORKSHOP', label: 'Usuario de taller' },
  { value: 'SUPER_ADMIN', label: 'Administrador general' }
] satisfies Array<{ value: MemberAccessType, label: string }>
const schema = z.object({
  fullName: z.string().min(2, 'Escribe el nombre.'),
  email: z.email('Escribe un correo válido.'),
  phone: z.string().optional(),
  accessType: z.enum(['WORKSHOP', 'SUPER_ADMIN']),
  workshopId: z.string(),
  role: z.enum(['MANAGER', 'ADVISOR', 'TECHNICIAN', 'CASHIER'])
}).superRefine((value, context) => {
  if (value.accessType === 'WORKSHOP' && !value.workshopId) {
    context.addIssue({
      code: 'custom',
      path: ['workshopId'],
      message: 'Selecciona un taller.'
    })
  }
})
type MemberSchema = z.output<typeof schema>
const state = reactive<MemberSchema>({
  fullName: '',
  email: '',
  phone: '',
  accessType: 'WORKSHOP',
  workshopId: props.selectedWorkshopId ?? props.workshops[0]?.id ?? '',
  role: 'MANAGER'
})

function resetForm() {
  const presetWorkshop = props.workshops.find(workshop => (
    workshop.slug === props.preset?.workshopSlug
  ))

  state.fullName = props.preset?.fullName ?? ''
  state.email = ''
  state.phone = ''
  state.accessType = props.preset?.accessType ?? 'WORKSHOP'
  state.workshopId = presetWorkshop?.id
    ?? props.selectedWorkshopId
    ?? props.workshops[0]?.id
    ?? ''
  state.role = props.preset?.role ?? 'MANAGER'
}

watch(
  [open, () => props.preset, () => props.selectedWorkshopId],
  ([isOpen]) => {
    if (isOpen) resetForm()
  }
)

const workshopOptions = computed(() => props.workshops.map(workshop => ({
  label: workshop.name,
  value: workshop.id
})))

async function onSubmit(event: FormSubmitEvent<MemberSchema>) {
  loading.value = true
  try {
    await $fetch('/api/members', { method: 'POST', body: event.data })
    toast.add({
      title: 'Usuario vinculado',
      description: 'La cuenta ya puede entrar con sus credenciales de Supabase.',
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
    title="Vincular usuario"
    description="La cuenta debe existir previamente en Supabase Auth."
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
        <UFormField
          v-if="allowSuperAdmin"
          name="accessType"
          label="Tipo de acceso"
          required
        >
          <USelect
            v-model="state.accessType"
            :items="accessTypeOptions"
            value-key="value"
            :size="responsiveControlSize"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-if="state.accessType === 'WORKSHOP'"
          name="workshopId"
          label="Taller"
          required
        >
          <USelect
            v-model="state.workshopId"
            :items="workshopOptions"
            value-key="value"
            :size="responsiveControlSize"
            class="w-full"
            :disabled="!allowWorkshopSelection && Boolean(selectedWorkshopId)"
          />
        </UFormField>
        <UFormField
          v-if="state.accessType === 'WORKSHOP'"
          name="role"
          label="Rol"
          required
        >
          <USelect
            v-model="state.role"
            :items="roleOptions"
            value-key="value"
            :size="responsiveControlSize"
            class="w-full"
          />
        </UFormField>
        <UAlert
          :title="state.accessType === 'SUPER_ADMIN' ? 'Acceso global' : 'Permisos por taller'"
          :description="state.accessType === 'SUPER_ADMIN'
            ? 'Este usuario podrá ver y administrar ambos talleres.'
            : 'El usuario sólo tendrá acceso al taller y las funciones de su rol.'"
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
        label="Vincular cuenta"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
