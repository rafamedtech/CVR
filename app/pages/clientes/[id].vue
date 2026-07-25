<script setup lang="ts">
import type { CustomerDetail } from '~/types/crm'

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const { isAllWorkshops } = useCrmSession()

const { data: customer, error, status } = await useFetch<CustomerDetail>(
  () => `/api/customers/${customerId.value}`,
  { key: `crm-customer-${customerId.value}` }
)

useHead({
  title: computed(() => customer.value?.fullName ?? 'Cliente')
})
</script>

<template>
  <UDashboardPanel id="customer-detail">
    <template #header>
      <UDashboardNavbar :title="customer?.fullName ?? 'Detalle del cliente'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/clientes"
            label="Volver a clientes"
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
        <USkeleton class="h-72 rounded-xl" />
        <USkeleton class="h-56 rounded-xl" />
        <USkeleton class="h-72 rounded-xl" />
      </div>

      <UAlert
        v-else-if="error"
        title="No se pudo cargar este cliente"
        description="Es posible que el cliente no exista o que no tengas acceso al taller correspondiente."
        icon="i-lucide-circle-alert"
        color="error"
        variant="subtle"
        :actions="[{ label: 'Volver a clientes', to: '/clientes' }]"
      />

      <div v-else-if="customer" class="space-y-8">
        <CustomersCustomerDetailProfile
          :customer="customer"
          :show-workshop-badge="isAllWorkshops"
        />

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="font-semibold text-highlighted">
                Vehículos
              </h2>
              <p class="text-sm text-muted">
                Flota registrada para este cliente.
              </p>
            </div>
            <UButton
              :to="{ path: '/vehicles', query: { customer: customer.id } }"
              label="Abrir vehículos"
              icon="i-lucide-external-link"
              color="neutral"
              variant="ghost"
            />
          </div>
          <CustomersCustomerDetailVehicles :vehicles="customer.vehicles" />
        </section>

        <section class="space-y-3">
          <div>
            <h2 class="font-semibold text-highlighted">
              Órdenes de trabajo
            </h2>
            <p class="text-sm text-muted">
              Historial de órdenes registradas hasta ahora.
            </p>
          </div>
          <OrdersTable :orders="customer.orders" />
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
