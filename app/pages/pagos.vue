<script setup lang="ts">
import { filterBySearchText, type CsvColumn } from '@rafamedtech/nuxt-shared/utils'
import type { PaymentListItem } from '~/types/crm'

useHead({ title: 'Pagos' })

const search = shallowRef('')
const { isAllWorkshops, isReadOnly, workshopTimeZone } = useCrmSession()
const { data: payments, status, error, refresh } = useFetch<PaymentListItem[]>('/api/payments', {
  lazy: true,
  server: false,
  default: () => [],
  key: 'crm-payments'
})

const filteredPayments = computed(() => filterBySearchText(payments.value, search.value, payment => [
  payment.order.orderNumber,
  payment.order.customerName,
  payment.order.vehicleLabel,
  payment.order.licensePlate,
  payment.reference,
  payment.recordedByName,
  payment.workshopName,
  paymentMethodLabels[payment.method]
]))

function csvText(value: string) {
  return /^[\s\uFEFF]*[=+@-]/.test(value) ? `'${value}` : value
}

const csvColumns: CsvColumn<PaymentListItem>[] = [
  { key: 'date', label: 'Fecha', value: row => formatDate(row.paidAt, true, workshopTimeZone(row.workshopId)) },
  { key: 'order', label: 'Orden', value: row => csvText(row.order.orderNumber) },
  { key: 'customer', label: 'Cliente', value: row => csvText(row.order.customerName) },
  { key: 'method', label: 'Método', value: row => paymentMethodLabels[row.method] },
  { key: 'amount', label: 'Importe', value: row => row.amount },
  { key: 'currency', label: 'Moneda', value: row => row.currency },
  { key: 'amountMxn', label: 'Importe en MXN', value: row => row.amountMxn }
]

const total = computed(() => filteredPayments.value.reduce((sum, payment) => sum + payment.amountMxn, 0))
</script>

<template>
  <UDashboardPanel id="pagos">
    <template #header>
      <DashboardNavbar title="Pagos registrados">
        <template #right>
          <WorkshopSwitcher />
          <AppCsvExportButton
            filename="pagos-cvr"
            :columns="csvColumns"
            :rows="filteredPayments"
            :disabled="status !== 'success'"
          />
        </template>
      </DashboardNavbar>

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
        v-if="isAllWorkshops && !isReadOnly"
        class="mb-4"
        title="Vista consolidada"
        description="Se muestran los pagos registrados en todos los talleres."
        icon="i-lucide-info"
        color="info"
        variant="subtle"
      />

      <PaymentsTable
        :payments="filteredPayments"
        :loading="status === 'idle' || status === 'pending'"
        :show-workshop="isAllWorkshops"
        :filtered="Boolean(search.trim())"
        :error="Boolean(error)"
        @retry="refresh()"
      />
    </template>
  </UDashboardPanel>
</template>
