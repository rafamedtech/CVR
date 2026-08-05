<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CustomerListItem } from '~/types/crm'

const props = defineProps<{
  customers: CustomerListItem[]
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const responsiveControlSize = useResponsiveControlSize()
const optionalVinSchema = z.preprocess(
  value => typeof value === 'string' && !value.trim() ? undefined : value,
  z.string().trim().max(30, 'El VIN no puede exceder 30 caracteres.').optional()
)
const optionalLicensePlateSchema = z.preprocess(
  value => typeof value === 'string' && !value.trim() ? undefined : value,
  z.string().trim().min(2, 'Escribe al menos 2 caracteres.').max(20).optional()
)

const schema = z.object({
  customerId: z.string().min(1, 'Selecciona un cliente.'),
  licensePlate: optionalLicensePlateSchema,
  vin: optionalVinSchema,
  make: z.string().min(2, 'Escribe la marca.'),
  model: z.string().min(1, 'Escribe el modelo.'),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().optional(),
  notes: z.string().optional()
})
type VehicleSchema = z.output<typeof schema>
const state = reactive<Partial<VehicleSchema>>({
  customerId: '',
  licensePlate: '',
  vin: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  notes: ''
})

const customerOptions = computed(() => props.customers.map(customer => ({
  label: customer.fullName,
  value: customer.id
})))

async function onSubmit(event: FormSubmitEvent<VehicleSchema>) {
  loading.value = true
  try {
    await $fetch('/api/vehicles', { method: 'POST', body: event.data })
    toast.add({ title: 'Vehículo registrado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('created')
  } catch (error) {
    toast.add({ title: 'No se pudo registrar el vehículo', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nuevo vehículo"
    description="Identificación y condiciones de recepción."
    :close="false"
    :dismissible="false"
    :ui="{ content: 'sm:max-w-3xl', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="vehicle-form"
        :schema="schema"
        :state="state"
        class="grid gap-4 sm:grid-cols-2"
        @submit="onSubmit"
      >
        <UFormField
          name="customerId"
          label="Cliente"
          required
          class="min-w-0 sm:col-span-2"
        >
          <USelectMenu
            v-model="state.customerId"
            :items="customerOptions"
            value-key="value"
            searchable
            :size="responsiveControlSize"
            class="min-w-0 max-w-full"
            :ui="{ base: 'w-full min-w-0', value: 'min-w-0 truncate', itemLabel: 'min-w-0 truncate' }"
            placeholder="Buscar cliente…"
          />
        </UFormField>
        <UFormField name="licensePlate" label="Placas">
          <UInput v-model="state.licensePlate" class="w-full uppercase" />
        </UFormField>
        <UFormField name="vin" label="VIN / número de serie">
          <UInput v-model="state.vin" class="w-full uppercase" />
        </UFormField>
        <UFormField name="make" label="Marca" required>
          <UInput v-model="state.make" class="w-full" />
        </UFormField>
        <UFormField name="model" label="Modelo" required>
          <UInput v-model="state.model" class="w-full" />
        </UFormField>
        <UFormField name="year" label="Año" required>
          <UInput v-model="state.year" type="number" class="w-full" />
        </UFormField>
        <UFormField name="color" label="Color">
          <UInput v-model="state.color" class="w-full" />
        </UFormField>
        <UFormField name="notes" label="Daños previos y observaciones" class="sm:col-span-2">
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
        form="vehicle-form"
        label="Guardar vehículo"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
