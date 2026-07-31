<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { customerAddressSchema, emptyCustomerAddress } from '#shared/customer-address'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  created: []
}>()

const toast = useToast()
const loading = shallowRef(false)
const schema = z.object({
  fullName: z.string().min(2, 'Escribe el nombre del cliente.'),
  phone: z.string().regex(/^\d{10}$/, 'Escribe un teléfono de 10 dígitos.'),
  alternatePhone: z.union([z.string().regex(/^\d{10}$/, 'Escribe un teléfono de 10 dígitos.'), z.literal('')]),
  email: z.union([z.email('Escribe un correo válido.'), z.literal('')]),
  taxId: z.string().optional(),
  address: customerAddressSchema,
  notes: z.string().optional()
})
type CustomerSchema = z.output<typeof schema>

const state = reactive<CustomerSchema>({
  fullName: '',
  phone: '',
  alternatePhone: '',
  email: '',
  taxId: '',
  address: emptyCustomerAddress(),
  notes: ''
})

function reset() {
  Object.assign(state, {
    fullName: '',
    phone: '',
    alternatePhone: '',
    email: '',
    taxId: '',
    address: emptyCustomerAddress(),
    notes: ''
  })
}

async function onSubmit(event: FormSubmitEvent<CustomerSchema>) {
  loading.value = true
  try {
    await $fetch('/api/customers', {
      method: 'POST',
      body: event.data
    })
    toast.add({ title: 'Cliente registrado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    reset()
    emit('created')
  } catch (error) {
    toast.add({
      title: 'No se pudo registrar el cliente',
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
    title="Nuevo cliente"
    description="Captura los datos de contacto y domicilio fiscal del cliente"
    :ui="{ content: 'sm:max-w-3xl', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="customer-form"
        :schema="schema"
        :state="state"
        class="grid gap-4 sm:grid-cols-2"
        @submit="onSubmit"
      >
        <div class="sm:col-span-2">
          <h3 class="text-base font-semibold text-highlighted">
            Datos de contacto
          </h3>
        </div>

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
        <CustomersCustomerAddressFields v-model="state.address" />
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
        form="customer-form"
        label="Guardar cliente"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
