<script setup lang="ts">
import type {
  CustomerListItem,
  OrderListItem,
  OrderStatus,
  VehicleListItem
} from '~/types/crm'

useHead({ title: 'Órdenes' })

const route = useRoute()
const search = shallowRef('')
const statusFilter = shallowRef<OrderStatus | 'ALL'>('ALL')
const createOpen = shallowRef(false)
const { activeWorkshop, canManageOrders, isAllWorkshops } = useCrmSession()

const { data: orders, status, refresh } = await useFetch<OrderListItem[]>('/api/orders', {
  default: () => [],
  key: 'crm-orders'
})
const { data: customers } = await useFetch<CustomerListItem[]>('/api/customers', {
  default: () => [],
  key: 'crm-customers-for-orders'
})
const { data: vehicles } = await useFetch<VehicleListItem[]>('/api/vehicles', {
  default: () => [],
  key: 'crm-vehicles-for-orders'
})
const statusOptions = [
  { label: 'Todos los estados', value: 'ALL' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label }))
]

const filteredOrders = computed(() => {
  const customerId = typeof route.query.customer === 'string' ? route.query.customer : null
  const term = search.value.trim().toLocaleLowerCase('es-MX')

  return orders.value.filter((order) => {
    if (customerId && order.customerId !== customerId) return false
    if (statusFilter.value !== 'ALL' && order.status !== statusFilter.value) return false
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
          <UTooltip :text="isAllWorkshops ? 'Selecciona una ubicación para poder usar este botón.' : undefined">
            <span class="inline-flex">
              <UButton
                label="Nueva orden"
                icon="i-lucide-file-plus-2"
                :disabled="!canManageOrders || !customers.length || !vehicles.length"
                @click="createOpen = true"
              />
            </span>
          </UTooltip>
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar orden, cliente, placas o vehículo…"
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
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            value-key="value"
            class="w-48"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="isAllWorkshops"
        class="mb-4"
        title="Vista consolidada"
        description="Selecciona un taller para crear una orden nueva."
        icon="i-lucide-info"
        color="info"
        variant="subtle"
      />
      <UAlert
        v-else-if="!customers.length || !vehicles.length"
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
        :loading="status === 'pending'"
        :show-workshop="isAllWorkshops"
      />
      <OrdersOrderFormModal
        v-model:open="createOpen"
        :customers="customers"
        :vehicles="vehicles"
        :default-tax-rate="activeWorkshop?.taxRate ?? 16"
        @created="refresh"
      />
    </template>
  </UDashboardPanel>
</template>
