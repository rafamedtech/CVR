<script setup lang="ts">
import { z } from 'zod'
import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  CustomerListItem,
  OrderDetail,
  OrderItemDraft,
  OrderPriority,
  TaxRate,
  VehicleListItem
} from '~/types/crm'
import { taxRateValues } from '~/utils/crm'
import { getOrderTaxRate } from '#shared/order-tax'

type InvoiceRequirement = 'required' | 'not-required'

const props = defineProps<{
  customers?: CustomerListItem[]
  vehicles?: VehicleListItem[]
  order?: OrderDetail | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  created: []
  updated: []
}>()
const toast = useToast()
const loading = shallowRef(false)
const formId = 'order-form'
const unassignedMemberValue = '__unassigned__'
const defaultPromisedDate = today(getLocalTimeZone())
const promisedDate = shallowRef<CalendarDate | undefined>(defaultPromisedDate)
const promisedDateOpen = ref(false)
const isEditing = computed(() => Boolean(props.order))
const modalTitle = computed(() => isEditing.value ? 'Editar orden de trabajo' : 'Nueva orden de trabajo')
const modalDescription = computed(() => isEditing.value
  ? 'Actualiza la información de la orden'
  : 'Captura la información básica de la orden')
const submitLabel = computed(() => isEditing.value ? 'Guardar cambios' : 'Crear cotización')

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
  customerId: z.string().min(1, 'Este campo es obligatorio'),
  vehicleId: z.string().min(1, 'Este campo es obligatorio'),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']),
  requiresInvoice: z.boolean(),
  complaint: z.string().min(3, 'Describe el servicio solicitado.'),
  diagnosis: z.string().optional(),
  intakeNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  promisedAt: z.string().optional(),
  assignedToId: z.string().optional(),
  items: z.array(lineSchema)
})
type OrderSchema = z.output<typeof schema>

const state = reactive<{
  customerId: string
  vehicleId: string
  priority: OrderPriority
  requiresInvoice: boolean
  complaint: string
  diagnosis: string
  intakeNotes: string
  internalNotes: string
  promisedAt: string
  assignedToId: string
  items: OrderItemDraft[]
}>({
  customerId: '',
  vehicleId: '',
  priority: 'NORMAL',
  requiresInvoice: false,
  complaint: '',
  diagnosis: '',
  intakeNotes: '',
  internalNotes: '',
  promisedAt: `${defaultPromisedDate.toString()}T12:00:00`,
  assignedToId: unassignedMemberValue,
  items: []
})

const invoiceRequirement = computed<InvoiceRequirement>({
  get: () => state.requiresInvoice ? 'required' : 'not-required',
  set: value => state.requiresInvoice = value === 'required'
})
const invoiceTaxRate = computed<TaxRate>(() => getOrderTaxRate(state.requiresInvoice))
const selectedCustomer = computed(() => props.order
  ? { id: props.order.customerId, fullName: props.order.customerName }
  : null)
const vehicleOptions = computed(() => {
  const options = (props.vehicles ?? [])
    .filter(vehicle => !state.customerId || vehicle.customerId === state.customerId)
    .map(vehicle => ({
      label: `${vehicle.licensePlate || 'Sin placas'} · ${vehicle.make} ${vehicle.model} ${vehicle.year}`,
      value: vehicle.id
    }))

  if (props.order && !options.some(option => option.value === props.order?.vehicleId)) {
    options.unshift({
      label: `${props.order.licensePlate} · ${props.order.vehicleLabel}`,
      value: props.order.vehicleId
    })
  }

  return options
})
const priorityOptions = Object.entries(orderPriorityLabels).map(([value, label]) => ({ value, label }))
const invoiceRequirementOptions: Array<{ label: string, value: InvoiceRequirement }> = [
  { label: 'No', value: 'not-required' },
  { label: 'Sí', value: 'required' }
]

function toLocalDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatPromisedDate(date: CalendarDate | undefined) {
  if (!date) return 'Selecciona una fecha'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium'
  }).format(date.toDate('UTC'))
}

function initializeForm(order?: OrderDetail | null) {
  if (order) {
    const localPromisedDate = toLocalDate(order.promisedAt)
    Object.assign(state, {
      customerId: order.customerId,
      vehicleId: order.vehicleId,
      priority: order.priority,
      requiresInvoice: order.requiresInvoice,
      complaint: order.complaint,
      diagnosis: order.diagnosis ?? '',
      intakeNotes: order.intakeNotes ?? '',
      internalNotes: order.internalNotes ?? '',
      promisedAt: localPromisedDate ? `${localPromisedDate}T12:00:00` : '',
      assignedToId: order.assignedToId ?? unassignedMemberValue,
      items: order.items.map(item => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: getOrderTaxRate(order.requiresInvoice)
      }))
    })
    promisedDate.value = localPromisedDate ? parseDate(localPromisedDate) : undefined
    return
  }

  Object.assign(state, {
    customerId: '',
    vehicleId: '',
    priority: 'NORMAL',
    requiresInvoice: false,
    complaint: '',
    diagnosis: '',
    intakeNotes: '',
    internalNotes: '',
    promisedAt: `${defaultPromisedDate.toString()}T12:00:00`,
    assignedToId: unassignedMemberValue,
    items: []
  })
  promisedDate.value = defaultPromisedDate
}

watch([open, () => props.order], ([isOpen, order]) => {
  if (isOpen) initializeForm(order)
}, { immediate: true })

watch(promisedDate, (date) => {
  state.promisedAt = date ? `${date.toString()}T12:00:00` : ''
})

watch(() => state.customerId, () => {
  if (!vehicleOptions.value.some(vehicle => vehicle.value === state.vehicleId)) {
    state.vehicleId = ''
  }
})

async function createOrder(data: OrderSchema) {
  const result = await $fetch<{ id: string }>('/api/orders', {
    method: 'POST',
    body: {
      ...data,
      promisedAt: data.promisedAt || null,
      assignedToId: ''
    }
  })
  toast.add({ title: 'Orden creada', color: 'success', icon: 'i-lucide-check' })
  open.value = false
  emit('created')
  await navigateTo(`/ordenes/${result.id}`)
}

async function updateOrder(data: OrderSchema) {
  if (!props.order) return

  await $fetch(`/api/orders/${props.order.id}`, {
    method: 'PATCH',
    body: {
      priority: data.priority,
      requiresInvoice: data.requiresInvoice,
      complaint: data.complaint,
      diagnosis: data.diagnosis || null,
      intakeNotes: data.intakeNotes || null,
      internalNotes: data.internalNotes || null,
      promisedAt: data.promisedAt || null,
      assignedToId: data.assignedToId === unassignedMemberValue ? '' : data.assignedToId,
      items: data.items
    }
  })
  toast.add({ title: 'Orden actualizada', color: 'success', icon: 'i-lucide-check' })
  open.value = false
  emit('updated')
}

async function onSubmit(event: FormSubmitEvent<OrderSchema>) {
  loading.value = true
  try {
    if (isEditing.value) {
      await updateOrder(event.data)
    } else {
      await createOrder(event.data)
    }
  } catch (error) {
    toast.add({
      title: isEditing.value ? 'No se pudo actualizar la orden' : 'No se pudo crear la orden',
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
    :title="modalTitle"
    :description="modalDescription"
    :close="false"
    :dismissible="false"
    :ui="{ content: 'sm:max-w-[44.8rem]', body: 'max-h-[72vh] overflow-y-auto', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        :id="formId"
        :schema="schema"
        :state="state"
        :validate-on="[]"
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField name="customerId" label="Cliente" required>
            <OrdersOrderCustomerSelectMenu
              v-model="state.customerId"
              :customers="props.customers"
              :selected-customer="selectedCustomer"
              :disabled="isEditing"
            />
          </UFormField>
          <UFormField name="vehicleId" label="Vehículo" required>
            <USelectMenu
              v-model="state.vehicleId"
              :items="vehicleOptions"
              value-key="value"
              searchable
              placeholder="Selecciona un vehículo"
              class="w-full"
              :disabled="isEditing || !state.customerId"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-4 sm:col-span-2 md:grid-cols-3">
            <UFormField name="requiresInvoice" label="¿Requiere factura?">
              <USelect
                v-model="invoiceRequirement"
                :items="invoiceRequirementOptions"
                value-key="value"
                class="w-full"
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
            <UFormField name="promisedAt" label="Entrega prometida" class="col-span-2 md:col-span-1">
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
          </div>
          <UFormField
            name="complaint"
            label="Servicio solicitado"
            required
            class="sm:col-span-2"
          >
            <UTextarea
              v-model="state.complaint"
              class="w-full"
              :rows="2"
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

        <template v-if="!isEditing">
          <USeparator />
          <OrdersOrderItemsEditor
            v-model="state.items"
            :tax-rate="invoiceTaxRate"
          />
        </template>
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
        :form="formId"
        :label="submitLabel"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
