<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PaymentListItem } from '~/types/crm'
import PaymentsMobileList from './PaymentsMobileList.vue'

const props = defineProps<{
  payments: PaymentListItem[]
  loading?: boolean
  showWorkshop?: boolean
}>()

const page = shallowRef(1)
const pageSize = 10
const paymentIds = computed(() => props.payments.map(payment => payment.id).join(','))
const paginatedPayments = computed(() => {
  const start = (page.value - 1) * pageSize
  return props.payments.slice(start, start + pageSize)
})
const visibleRange = computed(() => {
  if (!props.payments.length) return null

  const start = (page.value - 1) * pageSize + 1
  return {
    start,
    end: Math.min(start + pageSize - 1, props.payments.length)
  }
})

watch(paymentIds, () => {
  page.value = 1
})

const columns: TableColumn<PaymentListItem>[] = [{
  accessorKey: 'paidAt',
  header: 'Fecha'
}, {
  id: 'order',
  header: 'Orden'
}, {
  accessorKey: 'method',
  header: 'Método'
}, {
  accessorKey: 'reference',
  header: 'Referencia'
}, {
  accessorKey: 'amount',
  header: 'Importe'
}, {
  accessorKey: 'workshopName',
  header: 'Taller'
}]
</script>

<template>
  <div>
    <PaymentsMobileList
      class="md:hidden"
      :payments="paginatedPayments"
      :loading="loading"
      :show-workshop="showWorkshop"
    />

    <UCard class="hidden md:block" :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="paginatedPayments" :columns="columns" :loading="loading">
        <template #paidAt-cell="{ row }">
          <span class="text-sm">{{ formatDate(row.original.paidAt, true) }}</span>
        </template>
        <template #order-cell="{ row }">
          <div>
            <NuxtLink
              :to="`/ordenes/${row.original.order.id}`"
              class="font-medium text-primary hover:underline"
            >
              {{ row.original.order.orderNumber }}
            </NuxtLink>
            <p class="mt-1 text-xs text-muted">
              {{ row.original.order.customerName }} · {{ row.original.order.vehicleLabel }}
            </p>
            <p class="mt-1 text-xs text-muted">
              Total de la orden: {{ formatCurrency(row.original.order.total) }}
            </p>
          </div>
        </template>
        <template #method-cell="{ row }">
          <UBadge :label="paymentMethodLabels[row.original.method]" color="neutral" variant="subtle" />
        </template>
        <template #reference-cell="{ row }">
          <span>{{ row.original.reference || '—' }}</span>
        </template>
        <template #amount-cell="{ row }">
          <div class="text-right">
            <p class="font-semibold text-success">
              {{ formatCurrency(row.original.amount, row.original.currency) }}
            </p>
            <p v-if="row.original.currency === 'USD'" class="text-xs text-muted">
              TC {{ row.original.exchangeRate.toFixed(4) }} · {{ formatCurrency(row.original.amountMxn) }} MXN
            </p>
          </div>
        </template>
        <template #workshopName-cell="{ row }">
          <span v-if="showWorkshop" class="text-sm text-muted">{{ row.original.workshopName }}</span>
          <span v-else>—</span>
        </template>
        <template #empty>
          <div class="py-12 text-center">
            <UIcon name="i-lucide-hand-coins" class="mx-auto size-9 text-dimmed" />
            <p class="mt-3 font-medium text-highlighted">
              No hay pagos registrados
            </p>
            <p class="text-sm text-muted">
              Los pagos de las órdenes aparecerán aquí.
            </p>
          </div>
        </template>
      </UTable>
    </UCard>

    <div
      v-if="!loading && payments.length > pageSize"
      class="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p v-if="visibleRange" class="text-sm text-muted" aria-live="polite">
        Mostrando {{ visibleRange.start }}–{{ visibleRange.end }} de {{ payments.length }} pagos
      </p>
      <UPagination
        v-model:page="page"
        :total="payments.length"
        :items-per-page="pageSize"
        aria-label="Paginación de pagos"
      />
    </div>
  </div>
</template>
