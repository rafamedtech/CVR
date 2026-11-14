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
const search = shallowRef('')
const statusFilter = shallowRef<OrderStatus[]>([])
const createdAtRange = shallowRef<{
  start: DateValue | undefined
  end: DateValue | undefined
} | null>(null)
const { session, canManageOrders, isAllWorkshops, isReadOnly } = useCrmSession()
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
const createdAtBounds = computed(() => ({
  start: createdAtRange.value?.start?.toString(),
  end: createdAtRange.value?.end?.toString()
}))
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

const workshopFilter = shallowRef('all')
const workshopIcons = {
  BODY_SHOP: 'i-lucide-paintbrush',
  MECHANICAL: 'i-lucide-wrench',
  PAINT_STORE: 'i-lucide-palette'
}
const workshopFilterOptions = computed(() => [
  { label: 'Todas las órdenes', value: 'all', icon: 'i-lucide-clipboard-list' },
  ...(session.value?.workshops ?? []).map(workshop => ({
    label: workshop.name, value: workshop.id, icon: workshopIcons[workshop.type]
  }))
])

const filteredOrders = computed(() => {
  const customerId = typeof route.query.customer === 'string' ? route.query.customer : null
  const term = search.value.trim().toLocaleLowerCase('es-MX')
  const { start, end } = createdAtBounds.value

  return orders.value.filter((order) => {
    if (customerId && order.customerId !== customerId) return false
    if (isAllWorkshops.value && workshopFilter.value !== 'all' && order.workshopId !== workshopFilter.value) return false
    if (statusFilter.value.length && !statusFilter.value.includes(order.status)) return false
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
          <OrdersCreateMenu
            v-if="!isReadOnly"
            class="md:hidden"
            label="Nueva"
            :disabled="!canManageOrders || !customers.length || !vehicles.length"
            @create="createOpen = true"
          />
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar v-if="isAllWorkshops" class="py-3 lg:py-0">
        <div class="flex w-full min-w-0 items-center gap-3">
          <ReportsBusinessSelector
            v-model="workshopFilter"
            :options="workshopFilterOptions"
            aria-label="Filtrar órdenes por taller"
          />
        </div>
      </UDashboardToolbar>
      <OrdersFilters
        v-model:search="search"
        v-model:statuses="statusFilter"
        v-model:date-range="createdAtRange"
      >
        <template #customer-filter>
          <UButton
            v-if="route.query.customer"
            label="Quitar filtro de cliente"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            to="/ordenes"
          />
        </template>
        <template #right>
          <OrdersCreateMenu
            v-if="!isReadOnly"
            :disabled="!canManageOrders || !customers.length || !vehicles.length"
            @create="createOpen = true"
          />
        </template>
      </OrdersFilters>
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
