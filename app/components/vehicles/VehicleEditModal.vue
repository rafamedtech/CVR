<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CustomerListItem, VehicleListItem } from '~/types/crm'

const props = defineProps<{
  vehicle: VehicleListItem | null
  customers: CustomerListItem[]
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  updated: []
}>()

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

const state = reactive<VehicleSchema>({
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

watch([open, () => props.vehicle], ([isOpen, vehicle]) => {
  if (!isOpen || !vehicle) return

  Object.assign(state, {
    customerId: vehicle.customerId,
    licensePlate: vehicle.licensePlate ?? '',
    vin: vehicle.vin ?? '',
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color ?? '',
    notes: vehicle.notes ?? ''
  })
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<VehicleSchema>) {
  if (!props.vehicle) return

  loading.value = true
  try {
    await $fetch(`/api/vehicles/${props.vehicle.id}`, {
      method: 'PATCH',
      body: event.data
    })
    toast.add({ title: 'Vehículo actualizado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('updated')
  } catch (error) {
    toast.add({
      title: 'No se pudo actualizar el vehículo',
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
    title="Editar vehículo"
    description="Actualiza la información del vehículo"
    :close="false"
    :dismissible="false"
    :ui="{ content: 'sm:max-w-3xl', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="vehicle-edit-form"
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
        form="vehicle-edit-form"
        label="Guardar cambios"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
