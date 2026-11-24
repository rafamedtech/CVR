<script setup lang="ts">
import { getLocalTimeZone } from '@internationalized/date'
import {
  calendarDateKeyInTimeZone,
  normalizeSearchText, tableQueryField, tableQueryPage, tableQueryRange,
  tableQuerySorting, tableQueryText, type TableDateRange
} from '@rafamedtech/nuxt-shared/utils'
import type {
  CustomerListItem,
  OrderListItem,
  OrderStatus,
  VehicleListItem
} from '~/types/crm'

useHead({ title: 'Órdenes' })

const route = useRoute()
const router = useRouter()
const search = shallowRef('')
const statusFilter = shallowRef<OrderStatus[]>([])
const createdAtRange = shallowRef<TableDateRange | null>(null)
const workshopFilter = shallowRef('all')
const customerFilter = shallowRef('')
const page = shallowRef(1)
const pageSize = 10
const oldestFirst = shallowRef(false)
const sortOptions = [
  { label: 'Más recientes primero', value: 'recent' },
  { label: 'Más antiguas primero', value: 'oldest' }
]
const sortOrder = computed({
  get: () => oldestFirst.value ? 'oldest' : 'recent',
  set: (value: string) => { oldestFirst.value = value === 'oldest' }
})
const orderStatuses = Object.keys(orderStatusLabels) as OrderStatus[]
const { returnTo } = useTableQuery([
  tableQueryField('search', search, tableQueryText()),
  tableQueryField('customer', customerFilter, tableQueryText()),
  tableQueryField('workshop', workshopFilter, tableQueryText('all')),
  tableQueryField('status', statusFilter, {
    parse: (value) => {
      if (typeof value !== 'string') return []
      const selected = value.split(',')
      const statuses = orderStatuses.filter(status => selected.includes(status))
      return statuses.length === orderStatuses.length ? [] : statuses
    },
    serialize: statuses => statuses.length ? statuses.join(',') : undefined
  }),
  tableQueryRange(createdAtRange, 'date_from', 'date_to'),
  tableQueryField('sort', oldestFirst, {
    parse: value => tableQuerySorting.parse(value).some(entry => entry.id === 'createdAt' && !entry.desc),
    serialize: oldest => tableQuerySorting.serialize(oldest ? [{ id: 'createdAt', desc: false }] : [])
  }),
  tableQueryField('page', page, tableQueryPage)
], { page, resetOn: [search, customerFilter, workshopFilter, statusFilter, createdAtRange, oldestFirst] })
const returnToOrders = computed(() => {
  const { path, query, hash } = router.resolve(returnTo.value)
  return router.resolve({ path, query: { ...query, create: undefined }, hash }).fullPath
})
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
  return calendarDateKeyInTimeZone(new Date(value), getLocalTimeZone())
}

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
const selectedWorkshop = computed(() =>
  workshopFilterOptions.value.some(option => option.value === workshopFilter.value) ? workshopFilter.value : 'all'
)

const filteredOrders = computed(() => {
  const term = normalizeSearchText(search.value)
  const { start, end } = createdAtBounds.value

  return orders.value.filter((order) => {
    if (customerFilter.value && order.customerId !== customerFilter.value) return false
    if (isAllWorkshops.value && selectedWorkshop.value !== 'all' && order.workshopId !== selectedWorkshop.value) return false
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
    ].some(value => normalizeSearchText(value).includes(term))
  })
})
const sortedOrders = computed(() => oldestFirst.value
  ? filteredOrders.value.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
  : filteredOrders.value)

watch([status, () => sortedOrders.value.length, page], ([requestStatus, total, currentPage]) => {
  if (requestStatus === 'success') page.value = Math.min(currentPage, Math.max(1, Math.ceil(total / pageSize)))
}, { immediate: true })

const hasFilters = computed(() => Boolean(normalizeSearchText(search.value) || customerFilter.value || statusFilter.value.length || createdAtRange.value))

function clearFilters() {
  search.value = ''
  customerFilter.value = ''
  statusFilter.value = []
  createdAtRange.value = null
  page.value = 1
}
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
            :model-value="selectedWorkshop"
            :options="workshopFilterOptions"
            aria-label="Filtrar órdenes por taller"
            @update:model-value="workshopFilter = $event"
          />
        </div>
      </UDashboardToolbar>
      <OrdersFilters
        v-model:search="search"
        v-model:statuses="statusFilter"
        v-model:date-range="createdAtRange"
        :has-active-filters="hasFilters"
        @clear="clearFilters"
      >
        <template #customer-filter>
          <UButton
            v-if="customerFilter"
            label="Quitar filtro de cliente"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            @click="customerFilter = ''"
          />
          <USelect v-model="sortOrder" :items="sortOptions" aria-label="Ordenar por fecha de creación" />
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
        v-model:page="page"
        :page-size="pageSize"
        :orders="sortedOrders"
        :loading="status === 'idle' || status === 'pending'"
        :show-workshop="isAllWorkshops"
        :return-to="returnToOrders"
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
