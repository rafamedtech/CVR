<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OrderListItem } from '~/types/crm'

defineProps<{
  orders: OrderListItem[]
}>()

const columns: TableColumn<OrderListItem>[] = [{
  accessorKey: 'orderNumber',
  header: 'Orden'
}, {
  accessorKey: 'customerName',
  header: 'Cliente / vehículo'
}, {
  accessorKey: 'status',
  header: 'Estado'
}, {
  accessorKey: 'total',
  header: 'Importe'
}, {
  id: 'actions'
}]
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">
            Órdenes recientes
          </h2>
          <p class="text-sm text-muted">
            Última actividad del periodo seleccionado
          </p>
        </div>
        <UButton
          to="/orders"
          label="Ver todas"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-arrow-right"
        />
      </div>
    </template>

    <UTable :data="orders" :columns="columns">
      <template #orderNumber-cell="{ row }">
        <NuxtLink
          :to="`/orders/${row.original.id}`"
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
          :to="`/orders/${row.original.id}`"
          icon="i-lucide-arrow-up-right"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Abrir orden"
        />
      </template>

      <template #empty>
        <div class="py-10 text-center">
          <UIcon name="i-lucide-clipboard-list" class="mx-auto size-7 text-dimmed" />
          <p class="mt-2 text-sm text-muted">
            No hay órdenes en este periodo.
          </p>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
