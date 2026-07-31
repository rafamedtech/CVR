<script setup lang="ts">
import { z } from 'zod'
import type { CalendarDate } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CustomerListItem, OrderItemDraft, TaxRate, VehicleListItem } from '~/types/crm'
import { formatPhone, taxRateValues } from '~/utils/crm'

const props = defineProps<{
  customers: CustomerListItem[]
  vehicles: VehicleListItem[]
  defaultTaxRate: TaxRate
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const promisedDate = shallowRef<CalendarDate | undefined>()
const promisedDateOpen = ref(false)

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
  promisedAt: z.string().optional(),
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
  promisedAt: string
  items: OrderItemDraft[]
}>({
  customerId: '',
  vehicleId: '',
  priority: 'NORMAL',
  complaint: '',
  diagnosis: '',
  intakeNotes: '',
  internalNotes: '',
  promisedAt: '',
  items: []
})

const customerOptions = computed(() => props.customers.map(customer => ({
  label: `${customer.fullName} · ${formatPhone(customer.phone)}`,
  value: customer.id
})))
const vehicleOptions = computed(() => props.vehicles
  .filter(vehicle => !state.customerId || vehicle.customerId === state.customerId)
  .map(vehicle => ({
    label: `${vehicle.licensePlate} · ${vehicle.make} ${vehicle.model} ${vehicle.year}`,
    value: vehicle.id
  })))
const priorityOptions = Object.entries(orderPriorityLabels).map(([value, label]) => ({ value, label }))

function formatPromisedDate(date: CalendarDate | undefined) {
  if (!date) return 'Selecciona una fecha'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium'
  }).format(date.toDate('UTC'))
}

watch(promisedDate, (date) => {
  state.promisedAt = date ? `${date.toString()}T12:00:00` : ''
})

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
      body: event.data
    })
    toast.add({ title: 'Orden creada', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('created')
    await navigateTo(`/ordenes/${result.id}`)
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
    :ui="{ content: 'sm:max-w-[44.8rem]', body: 'max-h-[72vh] overflow-y-auto', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="order-form"
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
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
          <UFormField name="promisedAt" label="Entrega prometida">
            <UPopover v-model:open="promisedDateOpen">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar-days"
                :label="formatPromisedDate(promisedDate)"
                class="w-full justify-start font-normal"
              />

              <template #content>
                <UCalendar
                  v-model="promisedDate"
                  locale="es-MX"
                  @update:model-value="promisedDateOpen = false"
                />
              </template>
            </UPopover>
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
            class="sm:col-span-2"
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
          <UFormField name="intakeNotes" label="Daños previos / recepción" class="sm:col-span-2">
            <UTextarea
              v-model="state.intakeNotes"
              class="w-full"
              :rows="2"
              autoresize
            />
          </UFormField>
          <UFormField name="internalNotes" label="Notas internas" class="sm:col-span-2">
            <UTextarea
              v-model="state.internalNotes"
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
