<script setup lang="ts">
import { getLocalTimeZone, type DateValue } from '@internationalized/date'
import type {
  CustomerListItem,
  OrderListItem,
  OrderStatus,
  VehicleListItem
} from '~/types/crm'

useHead({ title: 'Órdenes' })

const route = useRoute()
const isMobileViewport = useMobileViewport()
const search = shallowRef('')
const statusFilter = shallowRef<OrderStatus[] | 'ALL'>('ALL')
const createdAtRange = shallowRef<{
  start: DateValue | undefined
  end: DateValue | undefined
} | null>(null)
const dateFilterOpen = shallowRef(false)
const { canManageOrders, isAllWorkshops, isReadOnly } = useCrmSession()
const createOpen = shallowRef(route.query.create === '1' && canManageOrders.value)

const { data: orders, status, refresh } = useFetch<OrderListItem[]>('/api/orders', {
  lazy: true,
  server: false,
  default: () => [],
  key: 'crm-orders'
})
const { data: customers, status: customersStatus } = useFetch<CustomerListItem[]>('/api/customers', {
  lazy: true,
  server: false,
  default: () => [],
  key: 'crm-customers-for-orders'
})
const { data: vehicles, status: vehiclesStatus } = useFetch<VehicleListItem[]>('/api/vehicles', {
  lazy: true,
  server: false,
  default: () => [],
  key: 'crm-vehicles-for-orders'
})
type StatusOptionValue = OrderStatus | 'ALL'

const orderStatuses = Object.keys(orderStatusLabels) as OrderStatus[]
const statusOptions: Array<{ label: string, value: StatusOptionValue }> = [
  { label: 'Todos los estados', value: 'ALL' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value: value as OrderStatus, label }))
]
const statusSelection = computed<StatusOptionValue[]>({
  get: (): StatusOptionValue[] => statusFilter.value === 'ALL' ? ['ALL'] : statusFilter.value,
  set: (selection: StatusOptionValue[]) => {
    const wasAllSelected = statusFilter.value === 'ALL'
    const selectedStatuses = selection.filter((value): value is OrderStatus => value !== 'ALL')

    if (selection.includes('ALL') && !wasAllSelected) {
      statusFilter.value = 'ALL'
      return
    }

    statusFilter.value = !selectedStatuses.length || selectedStatuses.length === orderStatuses.length
      ? 'ALL'
      : selectedStatuses
  }
})
const statusFilterLabel = computed(() => {
  if (statusFilter.value === 'ALL') return 'Todos los estados'
  if (statusFilter.value.length === 1) return orderStatusLabels[statusFilter.value[0]!]!
  return `${statusFilter.value.length} seleccionados`
})
const createdAtBounds = computed(() => ({
  start: createdAtRange.value?.start?.toString(),
  end: createdAtRange.value?.end?.toString()
}))
const dateFilterLabel = computed(() => {
  const { start, end } = createdAtRange.value ?? {}
  if (start && end) return `${formatCalendarDate(start)} – ${formatCalendarDate(end)}`
  if (start) return `Elige fecha final · ${formatCalendarDate(start)}`
  return 'Fecha de orden'
})
const searchPlaceholder = computed(() => isMobileViewport.value
  ? 'Buscar'
  : 'Buscar orden, cliente, placas o vehículo…')
const newOrderLabel = computed(() => isMobileViewport.value ? 'Nueva' : 'Nueva orden')

function formatCalendarDate(date: DateValue) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium'
  }).format(date.toDate(getLocalTimeZone()))
}

function getLocalDateKey(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getLocalTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}`
}

function handleDateRangeUpdate(value: { start: DateValue | undefined, end: DateValue | undefined } | null) {
  if (value?.start && value.end) dateFilterOpen.value = false
}

function clearDateFilter() {
  createdAtRange.value = null
  dateFilterOpen.value = false
}

const filteredOrders = computed(() => {
  const customerId = typeof route.query.customer === 'string' ? route.query.customer : null
  const term = search.value.trim().toLocaleLowerCase('es-MX')
  const { start, end } = createdAtBounds.value

  return orders.value.filter((order) => {
    if (customerId && order.customerId !== customerId) return false
    if (statusFilter.value !== 'ALL' && !statusFilter.value.includes(order.status)) return false
    if (start && end) {
      const orderDate = getLocalDateKey(order.createdAt)
      if (orderDate < start || orderDate > end) return false
    }
    if (!term) return true
    return [
      order.orderNumber,
      order.customerName,
      order.licensePlate,
      order.vehicleLabel
    ].some(value => value.toLocaleLowerCase('es-MX').includes(term))
  })
})
</script>

<template>
  <UDashboardPanel id="ordenes">
    <template #header>
      <UDashboardNavbar title="Órdenes de trabajo">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UTooltip v-if="!isReadOnly" :text="isAllWorkshops ? 'Selecciona una ubicación para poder usar este botón.' : undefined">
            <span class="inline-flex">
              <UButton
                :label="newOrderLabel"
                icon="i-lucide-file-plus-2"
                :disabled="!canManageOrders || !customers.length || !vehicles.length"
                @click="createOpen = true"
              />
            </span>
          </UTooltip>
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar :ui="{ root: 'py-3', left: 'w-full flex-col items-start gap-2 lg:flex-row lg:items-center' }">
        <template #left>
          <div class="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              :placeholder="searchPlaceholder"
              class="w-full sm:w-96"
            />
            <UButton
              v-if="route.query.customer"
              label="Quitar filtro de cliente"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              to="/ordenes"
            />
          </div>
          <div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <USelectMenu
              v-model="statusSelection"
              :items="statusOptions"
              value-key="value"
              multiple
              :search-input="false"
              class="min-w-0 w-full sm:w-56"
            >
              <template #default>
                <span class="min-w-0 truncate">{{ statusFilterLabel }}</span>
              </template>
            </USelectMenu>
            <UPopover v-model:open="dateFilterOpen" class="min-w-0 w-full sm:w-auto">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar-days"
                :label="dateFilterLabel"
                class="w-full justify-start font-normal sm:w-auto"
                :ui="{ label: 'truncate' }"
              />

              <template #content>
                <div class="p-2">
                  <UCalendar
                    v-model="createdAtRange"
                    range
                    locale="es-MX"
                    @update:model-value="handleDateRangeUpdate"
                  />
                  <div class="flex justify-end border-t border-muted pt-2">
                    <UButton
                      label="Limpiar fechas"
                      color="neutral"
                      variant="ghost"
                      :disabled="!createdAtRange"
                      @click="clearDateFilter"
                    />
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="!isAllWorkshops && customersStatus === 'success' && vehiclesStatus === 'success' && (!customers.length || !vehicles.length)"
        class="mb-4"
        title="Faltan datos para crear una orden"
        description="Necesitas por lo menos un cliente y un vehículo registrado."
        icon="i-lucide-circle-alert"
        color="warning"
        variant="subtle"
        :actions="[{ label: 'Registrar cliente', to: '/clientes' }, { label: 'Registrar vehículo', to: '/vehiculos' }]"
      />

      <OrdersTable
        :orders="filteredOrders"
        :loading="status === 'idle' || status === 'pending'"
        :show-workshop="isAllWorkshops"
        show-created-at
      />
      <OrdersOrderFormModal
        v-model:open="createOpen"
        :customers="customers"
        :vehicles="vehicles"
        @created="refresh"
      />
    </template>
  </UDashboardPanel>
</template>
