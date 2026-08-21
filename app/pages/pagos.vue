<script setup lang="ts">
import type { PaymentListItem } from '~/types/crm'

useHead({ title: 'Pagos' })

const search = shallowRef('')
const { isAllWorkshops } = useCrmSession()
const { data: payments, status } = await useFetch<PaymentListItem[]>('/api/payments', {
  default: () => [],
  key: 'crm-payments'
})

const filteredPayments = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es-MX')
  if (!term) return payments.value

  return payments.value.filter(payment => [
    payment.order.orderNumber,
    payment.order.customerName,
    payment.order.vehicleLabel,
    payment.order.licensePlate,
    payment.reference,
    payment.recordedByName,
    payment.workshopName,
    paymentMethodLabels[payment.method]
  ].some(value => value?.toLocaleLowerCase('es-MX').includes(term)))
})

const total = computed(() => filteredPayments.value.reduce((sum, payment) => sum + payment.amountMxn, 0))
</script>

<template>
  <UDashboardPanel id="pagos">
    <template #header>
      <UDashboardNavbar title="Pagos registrados">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <WorkshopSwitcher />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar :ui="{ left: 'w-full sm:w-auto' }">
        <template #left>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar orden, cliente, vehículo o referencia…"
            class="w-full sm:w-96"
          />
        </template>
        <template #right>
          <div class="text-right">
            <p class="text-xs text-muted">
              {{ filteredPayments.length }} {{ filteredPayments.length === 1 ? 'movimiento' : 'movimientos' }}
            </p>
            <p class="font-semibold text-success">
              {{ formatCurrency(total) }}
            </p>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="isAllWorkshops"
        class="mb-4"
        title="Vista consolidada"
        description="Se muestran los pagos registrados en todos los talleres."
        icon="i-lucide-info"
        color="info"
        variant="subtle"
      />

      <PaymentsTable
        :payments="filteredPayments"
        :loading="status === 'pending'"
        :show-workshop="isAllWorkshops"
      />
    </template>
  </UDashboardPanel>
</template>
