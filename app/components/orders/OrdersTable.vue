<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OrderListItem } from '~/types/crm'
import OrdersMobileList from './OrdersMobileList.vue'

const props = withDefaults(defineProps<{
  orders: OrderListItem[]
  loading?: boolean
  showWorkshop?: boolean
  showCustomer?: boolean
  showActions?: boolean
  showCreatedAt?: boolean
  mobileCards?: boolean
}>(), {
  showCustomer: true,
  showActions: true
})

const columns = computed<TableColumn<OrderListItem>[]>(() => {
  const columns: TableColumn<OrderListItem>[] = [{
    accessorKey: 'orderNumber',
    header: 'Orden'
  }, {
    accessorKey: 'customerName',
    header: props.showCustomer ? 'Cliente y vehículo' : 'Vehículo'
  }, {
    accessorKey: 'status',
    header: 'Estado'
  }, {
    accessorKey: 'total',
    header: 'Importe'
  }, {
    accessorKey: 'balance',
    header: 'Saldo'
  }, {
    accessorKey: 'promisedAt',
    header: 'Entrega'
  }, {
    accessorKey: 'workshopName',
    header: 'Taller'
  }]

  if (props.showCreatedAt) {
    columns.unshift({ accessorKey: 'createdAt', header: 'Fecha' })
  }

  if (props.showActions) {
    columns.push({ id: 'actions' })
  }

  return columns
})
</script>

<template>
  <div>
    <OrdersMobileList
      v-if="mobileCards"
      class="md:hidden"
      :orders="orders"
      :loading="loading"
      :show-workshop="showWorkshop"
      :show-created-at="showCreatedAt"
    />

    <UCard
      :class="mobileCards ? 'hidden md:block' : undefined"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <UTable :data="orders" :columns="columns" :loading="loading">
        <template #createdAt-cell="{ row }">
          <span class="text-sm">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #orderNumber-cell="{ row }">
          <div>
            <NuxtLink :to="`/ordenes/${row.original.id}`" class="font-medium text-primary hover:underline">
              {{ row.original.orderNumber }}
            </NuxtLink>
            <div class="mt-1 flex gap-1">
              <UBadge
                v-if="row.original.priority !== 'NORMAL'"
                :label="orderPriorityLabels[row.original.priority]"
                :color="row.original.priority === 'URGENT' ? 'error' : 'warning'"
                variant="subtle"
                size="sm"
              />
            </div>
          </div>
        </template>
        <template #customerName-cell="{ row }">
          <div v-if="showCustomer">
            <p class="font-medium text-highlighted">
              {{ row.original.customerName }}
            </p>
            <p class="text-xs text-muted">
              {{ row.original.vehicleLabel }} · {{ row.original.licensePlate }}
            </p>
          </div>
          <div v-else>
            <div class="flex items-center gap-2">
              <p class="font-medium text-highlighted">
                {{ row.original.vehicleLabel }}
              </p>
              <UBadge
                v-if="row.original.vehicleColor"
                :label="row.original.vehicleColor"
                color="neutral"
                variant="subtle"
                size="sm"
              />
            </div>
            <p class="text-xs text-muted">
              {{ row.original.licensePlate || 'Sin placas' }}
            </p>
          </div>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="orderStatusLabels[row.original.status]"
            :color="orderStatusColors[row.original.status]"
            variant="subtle"
          />
        </template>
        <template #total-cell="{ row }">
          <span class="font-medium text-highlighted">{{ formatCurrency(row.original.total) }}</span>
        </template>
        <template #balance-cell="{ row }">
          <span :class="row.original.balance > 0 ? 'text-warning' : 'text-success'">
            {{ formatCurrency(row.original.balance) }}
          </span>
        </template>
        <template #promisedAt-cell="{ row }">
          <span class="text-sm">{{ formatDate(row.original.promisedAt) }}</span>
        </template>
        <template #workshopName-cell="{ row }">
          <span v-if="showWorkshop" class="text-sm text-muted">{{ row.original.workshopName }}</span>
          <span v-else>—</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              :to="`/ordenes/${row.original.id}`"
              icon="i-lucide-arrow-right"
              label="Abrir"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </div>
        </template>
        <template #empty>
          <div class="py-12 text-center">
            <UIcon name="i-lucide-clipboard-list" class="mx-auto size-9 text-dimmed" />
            <p class="mt-3 font-medium text-highlighted">
              No hay órdenes
            </p>
            <p class="text-sm text-muted">
              Crea una cotización para comenzar el seguimiento.
            </p>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
