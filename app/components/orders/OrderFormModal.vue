<script setup lang="ts">
import { formatDateOnly } from '#shared/date'
import { z } from 'zod'
import { getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  CustomerListItem,
  MemberListItem,
  OrderDetail,
  OrderItemDraft,
  OrderPriority,
  TaxRate,
  VehicleListItem
} from '~/types/crm'
import { taxRateValues } from '~/utils/crm'
import { getOrderTaxRate } from '#shared/order-tax'

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
const timeZone = getLocalTimeZone()
const defaultOrderDate = today(timeZone)
const defaultPromisedDate = today(timeZone)
const promisedDate = shallowRef<DateValue | undefined>(defaultPromisedDate)
const orderDate = shallowRef<DateValue | undefined>(defaultOrderDate)
const isEditing = computed(() => Boolean(props.order))
const modalTitle = computed(() => isEditing.value ? 'Editar orden de trabajo' : 'Nueva orden de trabajo')
const modalDescription = computed(() => isEditing.value
  ? 'Actualiza la información de la orden'
  : 'Captura la información básica de la orden')
const submitLabel = computed(() => isEditing.value ? 'Guardar cambios' : 'Crear cotización')
const { data: members, status: membersStatus, error: membersError, execute: loadMembers } = useFetch<MemberListItem[]>('/api/members', {
  immediate: false,
  watch: false,
  default: () => []
})
const responsibleOptions = computed(() => {
  const options = members.value
    .filter(member => member.active && member.memberships.some(membership => membership.workshopId === props.order?.workshopId))
    .map(member => ({ label: member.fullName, value: member.id, disabled: false }))

  if (props.order?.assignedToId && !options.some(option => option.value === props.order?.assignedToId)) {
    options.unshift({
      label: props.order.assignedToName || 'Responsable actual',
      value: props.order.assignedToId,
      disabled: true
    })
  }

  return [{ label: 'Sin responsable asignado', value: unassignedMemberValue, disabled: false }, ...options]
})

const lineSchema = z.object({
  type: z.enum(['SERVICE', 'PART', 'LABOR', 'OTHER']),
  description: z.string().min(2, 'Describe el concepto.'),
  currency: z.enum(['MXN', 'USD']),
  exchangeRate: z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.'),
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
  orderDate: z.string().min(1, 'Selecciona la fecha de la orden.'),
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
  orderDate: string
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
  orderDate: `${defaultOrderDate.toString()}T12:00:00`,
  promisedAt: `${defaultPromisedDate.toString()}T12:00:00`,
  assignedToId: unassignedMemberValue,
  items: []
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

function toLocalDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatCalendarDate(date: DateValue) {
  return formatDateOnly(date.toString())
}

function initializeForm(order?: OrderDetail | null) {
  if (order) {
    const localOrderDate = toLocalDate(order.createdAt)
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
      orderDate: `${localOrderDate}T12:00:00`,
      promisedAt: localPromisedDate ? `${localPromisedDate}T12:00:00` : '',
      assignedToId: order.assignedToId ?? unassignedMemberValue,
      items: order.items.map(item => ({
        type: item.type,
        description: item.description,
        currency: item.currency,
        exchangeRate: item.exchangeRate,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: getOrderTaxRate(order.requiresInvoice)
      }))
    })
    orderDate.value = parseDate(localOrderDate)
    promisedDate.value = localPromisedDate ? parseDate(localPromisedDate) : undefined
    return
  }

  const currentOrderDate = today(timeZone)
  Object.assign(state, {
    customerId: '',
    vehicleId: '',
    priority: 'NORMAL',
    requiresInvoice: false,
    complaint: '',
    diagnosis: '',
    intakeNotes: '',
    internalNotes: '',
    orderDate: `${currentOrderDate.toString()}T12:00:00`,
    promisedAt: `${defaultPromisedDate.toString()}T12:00:00`,
    assignedToId: unassignedMemberValue,
    items: []
  })
  orderDate.value = currentOrderDate
  promisedDate.value = defaultPromisedDate
}

watch([open, () => props.order], ([isOpen, order]) => {
  if (isOpen) {
    initializeForm(order)
    if (order) void loadMembers()
  }
}, { immediate: true })

watch(promisedDate, (date) => {
  state.promisedAt = date ? `${date.toString()}T12:00:00` : ''
})

watch(orderDate, (date) => {
  state.orderDate = date ? `${date.toString()}T12:00:00` : ''
})

watch(() => state.customerId, () => {
  if (!vehicleOptions.value.some(vehicle => vehicle.value === state.vehicleId)) {
    state.vehicleId = ''
  }
})

async function createOrder(data: OrderSchema) {
  const { orderDate, ...createData } = data

  const result = await $fetch<{ id: string }>('/api/orders', {
    method: 'POST',
    body: {
      ...createData,
      createdAt: orderDate,
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
      createdAt: data.orderDate,
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
    :close="{ disabled: loading }"
    :dismissible="false"
    :ui="{
      content: 'w-[calc(100vw-2rem)] min-w-0 max-w-4xl',
      header: 'flex-wrap gap-4 pr-12 sm:pr-14',
      title: 'text-lg font-semibold text-primary',
      wrapper: 'min-w-0 flex-1',
      body: 'min-w-0 max-h-[72vh] overflow-x-hidden overflow-y-auto p-4 sm:p-6',
      footer: 'flex-wrap gap-2 justify-end bg-elevated/30'
    }"
  >
    <template #actions>
      <USwitch
        v-model="state.requiresInvoice"
        label="Requiere factura"
        class="ml-auto shrink-0"
      />
    </template>
    <template #body>
      <UForm
        :id="formId"
        :schema="schema"
        :state="state"
        :validate-on="[]"
        class="grid min-w-0 items-start gap-4 md:grid-cols-2"
        @submit="onSubmit"
      >
        <DetailCard
          title="Cliente y vehículo"
          icon="i-lucide-car"
          :ui="{ container: 'min-w-0 p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="grid min-w-0 gap-4">
            <UFormField
              name="customerId"
              label="Cliente"
              required
              class="min-w-0"
            >
              <OrdersOrderCustomerSelectMenu
                v-model="state.customerId"
                :customers="props.customers"
                :selected-customer="selectedCustomer"
                :disabled="isEditing"
              />
            </UFormField>
            <UFormField
              name="vehicleId"
              label="Vehículo"
              required
              class="min-w-0"
            >
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
          </div>
        </DetailCard>
        <DetailCard
          title="Datos de la orden"
          icon="i-lucide-clipboard-list"
          :ui="{ container: 'min-w-0 p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div
            class="grid min-w-0 grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2"
          >
            <UFormField
              v-if="isEditing"
              name="assignedToId"
              label="Responsable"
              class="min-w-0"
            >
              <USelectMenu
                v-model="state.assignedToId"
                :items="responsibleOptions"
                value-key="value"
                :search-input="{ placeholder: 'Buscar por nombre…' }"
                :loading="membersStatus === 'pending'"
                :disabled="membersStatus === 'pending' || Boolean(membersError)"
                icon="i-lucide-user-round"
                placeholder="Selecciona un responsable"
                class="w-full"
              >
                <template #empty>
                  No se encontraron usuarios disponibles.
                </template>
              </USelectMenu>
              <div v-if="membersError" class="mt-2 flex items-center gap-2" role="alert">
                <p class="text-sm text-error">
                  No se pudieron cargar los usuarios.
                </p>
                <UButton
                  label="Reintentar"
                  color="neutral"
                  variant="link"
                  size="sm"
                  @click="loadMembers()"
                />
              </div>
            </UFormField>
            <UFormField name="priority" label="Prioridad" class="min-w-0">
              <USelect
                v-model="state.priority"
                :items="priorityOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="orderDate"
              label="Fecha de la orden"
              required
              class="min-w-0"
            >
              <CalendarDatePicker
                v-model="orderDate"
                :time-zone="timeZone"
                :format-value="formatCalendarDate"
                placeholder="Selecciona una fecha"
                class="w-full justify-start font-normal"
                :aria-label="`Fecha de la orden: ${orderDate ? formatCalendarDate(orderDate) : 'Selecciona una fecha'}`"
              />
            </UFormField>
            <UFormField
              name="promisedAt"
              label="Entrega prometida"
              class="min-w-0 sm:col-span-2 md:col-span-1"
            >
              <CalendarDatePicker
                v-model="promisedDate"
                :time-zone="timeZone"
                :format-value="formatCalendarDate"
                placeholder="Selecciona una fecha"
                class="w-full justify-start font-normal"
                :aria-label="`Entrega prometida: ${promisedDate ? formatCalendarDate(promisedDate) : 'Selecciona una fecha'}`"
              />
            </UFormField>
          </div>
        </DetailCard>
        <DetailCard
          title="Servicio y recepción"
          icon="i-lucide-notebook-pen"
          class="min-w-0 md:col-span-2"
          :ui="{ container: 'min-w-0 p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="grid min-w-0 gap-4 sm:grid-cols-2">
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
        </DetailCard>

        <DetailCard
          v-if="!isEditing"
          title="Conceptos de la cotización"
          icon="i-lucide-list-plus"
          class="min-w-0 md:col-span-2"
          :ui="{ container: 'min-w-0 p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <OrdersOrderItemsEditor
            v-model="state.items"
            :tax-rate="invoiceTaxRate"
          />
        </DetailCard>
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
