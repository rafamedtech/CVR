<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PaymentListItem } from '~/types/crm'
import PaymentsMobileList from './PaymentsMobileList.vue'

const { workshopTimeZone } = useCrmSession()

const props = defineProps<{
  payments: PaymentListItem[]
  loading?: boolean
  error?: boolean
  filtered?: boolean
  showWorkshop?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()

const page = shallowRef(1)
const pageSize = 10
const paymentIds = computed(() => props.payments.map(payment => payment.id).join(','))
watch(paymentIds, () => {
  page.value = 1
})

const columns: TableColumn<PaymentListItem>[] = [{
  accessorKey: 'paidAt',
  header: 'Fecha'
}, {
  id: 'order',
  accessorFn: row => row.order.orderNumber,
  header: 'Orden'
}, {
  id: 'method',
  accessorFn: row => paymentMethodLabels[row.method],
  header: 'Método'
}, {
  accessorKey: 'reference',
  header: 'Referencia'
}, {
  id: 'amount',
  accessorFn: row => row.amountMxn,
  header: 'Importe'
}, {
  accessorKey: 'workshopName',
  header: 'Taller'
}]
</script>

<template>
  <ListTable
    v-model:page="page"
    :data="payments"
    :columns="columns"
    :get-row-id="row => row.id"
    :page-size="pageSize"
    show-mobile-sort
    :loading="loading"
    loading-label="Cargando pagos"
    :error="error"
    error-title="Pagos no disponibles"
    error-message="No se pudieron cargar los pagos registrados."
    @update:sorting="page = 1"
    @retry="emit('retry')"
  >
    <template #mobile="{ rows }">
      <PaymentsMobileList
        :payments="rows"
        :show-workshop="showWorkshop"
        :filtered="filtered"
      />
    </template>
    <template #paidAt-cell="{ row }">
      <span class="text-sm">{{ formatDate(row.original.paidAt, true, workshopTimeZone(row.original.workshopId)) }}</span>
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
          {{ filtered ? 'No hay pagos que coincidan con la búsqueda' : 'No hay pagos registrados' }}
        </p>
        <p class="text-sm text-muted">
          Los pagos de las órdenes aparecerán aquí.
        </p>
      </div>
    </template>
    <template #pagination>
      <ListPagination
        v-model:page="page"
        label="pagos"
        :total-results="payments.length"
        :page-size="pageSize"
        aria-label="Paginación de pagos"
        hide-single-page
      />
    </template>
  </ListTable>
</template>
