<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CustomerListItem } from '~/types/crm'

const props = defineProps<{
  customer: CustomerListItem | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  updated: []
}>()

const toast = useToast()
const loading = shallowRef(false)
const schema = z.object({
  fullName: z.string().min(2, 'Escribe el nombre del cliente.'),
  phone: z.string().regex(/^\d{10}$/, 'Escribe un teléfono de 10 dígitos.'),
  alternatePhone: z.union([z.string().regex(/^\d{10}$/, 'Escribe un teléfono de 10 dígitos.'), z.literal('')]),
  email: z.union([z.email('Escribe un correo válido.'), z.literal('')]),
  taxId: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
})
type CustomerSchema = z.output<typeof schema>

const state = reactive<CustomerSchema>({
  fullName: '',
  phone: '',
  alternatePhone: '',
  email: '',
  taxId: '',
  address: '',
  notes: ''
})

watch([open, () => props.customer], ([isOpen, customer]) => {
  if (!isOpen || !customer) return

  Object.assign(state, {
    fullName: customer.fullName,
    phone: customer.phone,
    alternatePhone: customer.alternatePhone ?? '',
    email: customer.email ?? '',
    taxId: customer.taxId ?? '',
    address: customer.address ?? '',
    notes: customer.notes ?? ''
  })
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<CustomerSchema>) {
  if (!props.customer) return

  loading.value = true
  try {
    await $fetch(`/api/customers/${props.customer.id}`, {
      method: 'PATCH',
      body: event.data
    })
    toast.add({ title: 'Cliente actualizado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('updated')
  } catch (error) {
    toast.add({
      title: 'No se pudo actualizar el cliente',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Editar cliente"
    description="Actualiza los datos de contacto y facturación interna."
    :ui="{ content: 'sm:max-w-2xl', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="customer-edit-form"
        :schema="schema"
        :state="state"
        class="grid gap-4 sm:grid-cols-2"
        @submit="onSubmit"
      >
        <UFormField
          name="fullName"
          label="Nombre completo"
          required
          class="sm:col-span-2"
        >
          <UInput v-model="state.fullName" class="w-full" autofocus />
        </UFormField>
        <UFormField name="phone" label="Teléfono" required>
          <PhoneInput v-model="state.phone" />
        </UFormField>
        <UFormField name="alternatePhone" label="Teléfono alterno">
          <PhoneInput v-model="state.alternatePhone" />
        </UFormField>
        <UFormField name="email" label="Correo">
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>
        <UFormField name="taxId" label="RFC">
          <UInput v-model="state.taxId" class="w-full" />
        </UFormField>
        <UFormField name="address" label="Domicilio" class="sm:col-span-2">
          <UTextarea
            v-model="state.address"
            class="w-full"
            :rows="2"
            autoresize
          />
        </UFormField>
        <UFormField name="notes" label="Notas" class="sm:col-span-2">
          <UTextarea
            v-model="state.notes"
            class="w-full"
            :rows="3"
            autoresize
          />
        </UFormField>
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
        form="customer-edit-form"
        label="Guardar cambios"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
