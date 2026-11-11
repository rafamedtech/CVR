<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OrderListItem } from '~/types/crm'
import OrdersMobileList from '~/components/orders/OrdersMobileList.vue'

type OrderDateField = 'createdAt' | 'promisedAt'

const props = defineProps<{
  title: string
  description?: string
  emptyMessage: string
  orders: OrderListItem[]
  dateField?: OrderDateField
  mobileDate?: OrderDateField
  showFinancials?: boolean
  compact?: boolean
}>()

const { isAllWorkshops } = useCrmSession()
const mobileOrders = computed(() => props.orders.slice(0, 3))

const columns = computed<TableColumn<OrderListItem>[]>(() => {
  const items: TableColumn<OrderListItem>[] = [{
    accessorKey: 'orderNumber',
    header: 'Orden'
  }, {
    accessorKey: 'customerName',
    header: 'Cliente / vehículo'
  }, {
    accessorKey: 'status',
    header: 'Estado'
  }, {
    id: 'actions'
  }]

  if (props.showFinancials !== false) items.splice(items.length - 1, 0, { accessorKey: 'total', header: 'Importe' })

  if (props.dateField === 'createdAt') {
    items.splice(2, 0, { accessorKey: 'createdAt', header: 'Fecha' })
  } else if (props.dateField === 'promisedAt') {
    items.splice(2, 0, { accessorKey: 'promisedAt', header: 'Entrega' })
  }

  return items
})
</script>

<template>
  <DetailCard :ui="{ container: 'min-w-0 lg:flex', wrapper: 'w-full flex-none', body: 'w-full' }">
    <template #title>
      <DetailSectionHeading :title="title" :description="description">
        <template #actions>
          <UButton
            to="/ordenes"
            label="Ver todas"
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-arrow-right"
          />
        </template>
      </DetailSectionHeading>
    </template>

    <div :class="compact ? undefined : 'md:hidden'">
      <OrdersMobileList
        :orders="compact ? orders : mobileOrders"
        :show-workshop="isAllWorkshops"
        :show-created-at="props.mobileDate === 'createdAt'"
        :show-promised-at="props.mobileDate === 'promisedAt'"
        show-customer
        show-vehicle
        :show-financials="showFinancials"
        :empty-message="emptyMessage"
      />
    </div>

    <DetailTable
      v-if="!compact"
      class="hidden md:block"
      :data="props.orders"
      :columns="columns"
      :empty="emptyMessage"
    >
      <template #orderNumber-cell="{ row }">
        <NuxtLink
          :to="`/ordenes/${row.original.id}`"
          class="font-medium text-primary hover:underline"
        >
          {{ row.original.orderNumber }}
        </NuxtLink>
      </template>

      <template #customerName-cell="{ row }">
        <div>
          <p class="font-medium text-highlighted">
            {{ row.original.customerName }}
          </p>
          <p class="max-w-48 truncate text-xs text-muted">
            {{ row.original.vehicleLabel }}
          </p>
        </div>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-default">
          {{ formatDate(row.original.createdAt) }}
        </span>
      </template>

      <template #promisedAt-cell="{ row }">
        <span class="text-sm text-default">
          {{ row.original.promisedAt ? formatDate(row.original.promisedAt) : 'Sin fecha' }}
        </span>
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :label="orderStatusLabels[row.original.status]"
          :color="orderStatusColors[row.original.status]"
          variant="subtle"
          size="sm"
        />
      </template>

      <template #total-cell="{ row }">
        <span class="font-medium tabular-nums text-highlighted">
          {{ formatCurrency(row.original.total) }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <UButton
          :to="`/ordenes/${row.original.id}`"
          icon="i-lucide-arrow-up-right"
          color="neutral"
          variant="ghost"
          aria-label="Abrir orden"
        />
      </template>
    </DetailTable>
  </DetailCard>
</template>
