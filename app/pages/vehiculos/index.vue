<script setup lang="ts">
import type { CustomerListItem, VehicleListItem } from '~/types/crm'

useHead({ title: 'Vehículos' })

const route = useRoute()
const search = shallowRef('')
const createOpen = shallowRef(false)
const editOpen = shallowRef(false)
const assignmentsOpen = shallowRef(false)
const selectedVehicle = shallowRef<VehicleListItem | null>(null)
const { session, canManageCustomers, isAllWorkshops, isSuperAdmin } = useCrmSession()
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
const canEditVehicles = computed(() => canManageCustomers.value || isSuperAdmin.value)

function handleEdit(vehicle: VehicleListItem) {
  selectedVehicle.value = vehicle
  editOpen.value = true
}

function handleAssignWorkshops(vehicle: VehicleListItem) {
  selectedVehicle.value = vehicle
  assignmentsOpen.value = true
}
</script>

<template>
  <UDashboardPanel id="vehiculos">
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
            to="/vehiculos"
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
        :can-edit="canEditVehicles"
        :can-assign-workshops="isSuperAdmin"
        @edit="handleEdit"
        @assign-workshops="handleAssignWorkshops"
      />
      <VehiclesVehicleFormModal
        v-model:open="createOpen"
        :customers="customers"
        @created="refresh"
      />
      <VehiclesVehicleEditModal
        v-model:open="editOpen"
        :vehicle="selectedVehicle"
        :customers="customers"
        @updated="refresh"
      />
      <VehiclesVehicleWorkshopsModal
        v-model:open="assignmentsOpen"
        :vehicle="selectedVehicle"
        :workshops="session?.workshops ?? []"
        @updated="refresh"
      />
    </template>
  </UDashboardPanel>
</template>
