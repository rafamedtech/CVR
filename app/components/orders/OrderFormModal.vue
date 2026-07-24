<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CustomerListItem, OrderItemDraft, TaxRate, VehicleListItem } from '~/types/crm'
import { taxRateValues } from '~/utils/crm'

const props = defineProps<{
  customers: CustomerListItem[]
  vehicles: VehicleListItem[]
  members: Array<{ id: string, fullName: string, role: string }>
  defaultTaxRate: TaxRate
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const unassignedMemberValue = '__unassigned__'

const lineSchema = z.object({
  type: z.enum(['SERVICE', 'PART', 'LABOR', 'OTHER']),
  description: z.string().min(2, 'Describe el concepto.'),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().refine(value => taxRateValues.includes(value as TaxRate), 'Selecciona una tasa de IVA válida.')
})
const schema = z.object({
  customerId: z.string().min(1, 'Selecciona un cliente.'),
  vehicleId: z.string().min(1, 'Selecciona un vehículo.'),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']),
  complaint: z.string().min(3, 'Describe el servicio solicitado.'),
  diagnosis: z.string().optional(),
  intakeNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  mileageIn: z.coerce.number().int().nonnegative().optional(),
  fuelLevelIn: z.coerce.number().int().min(0).max(100).optional(),
  promisedAt: z.string().optional(),
  assignedToId: z.string().optional(),
  items: z.array(lineSchema)
})
type OrderSchema = z.output<typeof schema>

const state = reactive<{
  customerId: string
  vehicleId: string
  priority: 'NORMAL' | 'HIGH' | 'URGENT'
  complaint: string
  diagnosis: string
  intakeNotes: string
  internalNotes: string
  mileageIn?: number
  fuelLevelIn?: number
  promisedAt: string
  assignedToId: string
  items: OrderItemDraft[]
}>({
  customerId: '',
  vehicleId: '',
  priority: 'NORMAL',
  complaint: '',
  diagnosis: '',
  intakeNotes: '',
  internalNotes: '',
  mileageIn: undefined,
  fuelLevelIn: undefined,
  promisedAt: '',
  assignedToId: unassignedMemberValue,
  items: []
})

const customerOptions = computed(() => props.customers.map(customer => ({
  label: `${customer.fullName} · ${customer.phone}`,
  value: customer.id
})))
const vehicleOptions = computed(() => props.vehicles
  .filter(vehicle => !state.customerId || vehicle.customerId === state.customerId)
  .map(vehicle => ({
    label: `${vehicle.licensePlate} · ${vehicle.make} ${vehicle.model} ${vehicle.year}`,
    value: vehicle.id
  })))
const memberOptions = computed(() => [
  { label: 'Sin asignar', value: unassignedMemberValue },
  ...props.members.map(member => ({
    label: `${member.fullName} · ${member.role === 'TECHNICIAN' ? 'Técnico' : workshopRoleLabels[member.role as keyof typeof workshopRoleLabels] ?? member.role}`,
    value: member.id
  }))
])
const priorityOptions = Object.entries(orderPriorityLabels).map(([value, label]) => ({ value, label }))

watch(() => state.customerId, () => {
  if (!vehicleOptions.value.some(vehicle => vehicle.value === state.vehicleId)) {
    state.vehicleId = ''
  }
})

async function onSubmit(event: FormSubmitEvent<OrderSchema>) {
  loading.value = true
  try {
    const result = await $fetch<{ id: string }>('/api/orders', {
      method: 'POST',
      body: {
        ...event.data,
        assignedToId: event.data.assignedToId === unassignedMemberValue ? '' : event.data.assignedToId
      }
    })
    toast.add({ title: 'Orden creada', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('created')
    await navigateTo(`/orders/${result.id}`)
  } catch (error) {
    toast.add({ title: 'No se pudo crear la orden', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nueva orden de trabajo"
    description="La orden inicia como cotización y avanza conforme el cliente la autoriza."
    :ui="{ content: 'sm:max-w-5xl', body: 'max-h-[72vh] overflow-y-auto', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="order-form"
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <UFormField name="customerId" label="Cliente" required>
            <USelectMenu
              v-model="state.customerId"
              :items="customerOptions"
              value-key="value"
              searchable
              class="w-full"
            />
          </UFormField>
          <UFormField name="vehicleId" label="Vehículo" required>
            <USelectMenu
              v-model="state.vehicleId"
              :items="vehicleOptions"
              value-key="value"
              searchable
              class="w-full"
              :disabled="!state.customerId"
            />
          </UFormField>
          <UFormField name="priority" label="Prioridad">
            <USelect
              v-model="state.priority"
              :items="priorityOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="complaint"
            label="Servicio solicitado"
            required
            class="sm:col-span-2 lg:col-span-3"
          >
            <UTextarea
              v-model="state.complaint"
              class="w-full"
              :rows="3"
              autoresize
            />
          </UFormField>
          <UFormField name="diagnosis" label="Diagnóstico inicial" class="sm:col-span-2">
            <UTextarea
              v-model="state.diagnosis"
              class="w-full"
              :rows="3"
              autoresize
            />
          </UFormField>
          <UFormField name="assignedToId" label="Responsable">
            <USelect
              v-model="state.assignedToId"
              :items="memberOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField name="mileageIn" label="Kilometraje de entrada">
            <UInput
              v-model="state.mileageIn"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>
          <UFormField name="fuelLevelIn" label="Combustible de entrada (%)">
            <UInput
              v-model="state.fuelLevelIn"
              type="number"
              min="0"
              max="100"
              class="w-full"
            />
          </UFormField>
          <UFormField name="promisedAt" label="Entrega prometida">
            <UInput v-model="state.promisedAt" type="datetime-local" class="w-full" />
          </UFormField>
          <UFormField name="intakeNotes" label="Daños previos / recepción" class="sm:col-span-2 lg:col-span-3">
            <UTextarea
              v-model="state.intakeNotes"
              class="w-full"
              :rows="2"
              autoresize
            />
          </UFormField>
        </div>

        <USeparator />
        <OrdersOrderItemsEditor
          v-model="state.items"
          :default-tax-rate="defaultTaxRate"
        />

        <UFormField name="internalNotes" label="Notas internas">
          <UTextarea
            v-model="state.internalNotes"
            class="w-full"
            :rows="2"
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
        form="order-form"
        label="Crear cotización"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
