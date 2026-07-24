<script setup lang="ts">
import type { CustomerListItem, VehicleListItem } from '~/types/crm'

useHead({ title: 'Vehículos' })

const route = useRoute()
const search = shallowRef('')
const createOpen = shallowRef(false)
const { canManageCustomers, isAllWorkshops } = useCrmSession()
const { data: vehicles, status, refresh } = await useFetch<VehicleListItem[]>('/api/vehicles', {
  default: () => [],
  key: 'crm-vehicles'
})
const { data: customers } = await useFetch<CustomerListItem[]>('/api/customers', {
  default: () => [],
  key: 'crm-customers-for-vehicles'
})

const filteredVehicles = computed(() => {
  const customerId = typeof route.query.customer === 'string' ? route.query.customer : null
  const term = search.value.trim().toLocaleLowerCase('es-MX')

  return vehicles.value.filter((vehicle) => {
    if (customerId && vehicle.customerId !== customerId) return false
    if (!term) return true
    return [
      vehicle.licensePlate,
      vehicle.vin,
      vehicle.make,
      vehicle.model,
      vehicle.customerName
    ].some(value => value?.toLocaleLowerCase('es-MX').includes(term))
  })
})
</script>

<template>
  <UDashboardPanel id="vehicles">
    <template #header>
      <UDashboardNavbar title="Vehículos">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UTooltip :text="isAllWorkshops ? 'Selecciona una ubicación para poder usar este botón.' : undefined">
            <span class="inline-flex">
              <UButton
                label="Nuevo vehículo"
                icon="i-lucide-circle-plus"
                :disabled="!canManageCustomers || !customers.length"
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
            placeholder="Buscar placas, VIN, vehículo o cliente…"
            class="w-full sm:w-96"
          />
          <UButton
            v-if="route.query.customer"
            label="Quitar filtro de cliente"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            to="/vehicles"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="isAllWorkshops"
        class="mb-4"
        title="Selecciona un taller para registrar vehículos"
        icon="i-lucide-info"
        color="info"
        variant="subtle"
      />
      <UAlert
        v-else-if="!customers.length"
        class="mb-4"
        title="Primero registra un cliente"
        description="Cada vehículo debe quedar asociado a su propietario."
        icon="i-lucide-user-plus"
        color="warning"
        variant="subtle"
        :actions="[{ label: 'Ir a clientes', to: '/clientes' }]"
      />

      <VehiclesTable
        :vehicles="filteredVehicles"
        :loading="status === 'pending'"
        :show-workshop="isAllWorkshops"
      />
      <VehiclesVehicleFormModal
        v-model:open="createOpen"
        :customers="customers"
        @created="refresh"
      />
    </template>
  </UDashboardPanel>
</template>
