<script setup lang="ts">
import type { VehicleDetail } from '~/types/crm'

const route = useRoute()
const vehicleId = computed(() => route.params.id as string)
const { isAllWorkshops } = useCrmSession()

const { data: vehicle, error, status } = await useFetch<VehicleDetail>(
  () => `/api/vehicles/${vehicleId.value}`,
  { key: `crm-vehicle-${vehicleId.value}` }
)

useHead({ title: 'Detalle del vehículo' })
</script>

<template>
  <UDashboardPanel id="vehicle-detail">
    <template #header>
      <UDashboardNavbar title="Detalle del vehículo">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/vehiculos"
            label="Volver"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
          />
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="space-y-6">
        <USkeleton class="h-80 rounded-xl" />
        <USkeleton class="h-72 rounded-xl" />
      </div>

      <UAlert
        v-else-if="error"
        title="No se pudo cargar este vehículo"
        description="Es posible que el vehículo no exista o que no tengas acceso al taller correspondiente."
        icon="i-lucide-circle-alert"
        color="error"
        variant="subtle"
        :actions="[{ label: 'Volver a vehículos', to: '/vehiculos' }]"
      />

      <div v-else-if="vehicle" class="space-y-8">
        <VehiclesVehicleDetailProfile
          :vehicle="vehicle"
          :show-workshop-badge="isAllWorkshops"
        />

        <section class="space-y-3">
          <div>
            <h2 class="font-semibold text-highlighted">
              Órdenes de trabajo
            </h2>
            <p class="text-sm text-muted">
              Historial de órdenes registradas para este vehículo.
            </p>
          </div>
          <OrdersTable
            :orders="vehicle.orders"
            :show-workshop="isAllWorkshops"
            :show-vehicle="false"
            :show-actions="false"
            show-created-at
            mobile-cards
          />
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
