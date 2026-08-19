<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OrderListItem } from '~/types/crm'
import OrdersMobileList from './OrdersMobileList.vue'

const props = withDefaults(defineProps<{
  orders: OrderListItem[]
  loading?: boolean
  showWorkshop?: boolean
  showCustomer?: boolean
  showVehicle?: boolean
  showCreatedAt?: boolean
}>(), {
  showCustomer: true,
  showVehicle: true
})

const page = shallowRef(1)
const pageSize = 10
const orderIds = computed(() => props.orders.map(order => order.id).join(','))
const paginatedOrders = computed(() => {
  const start = (page.value - 1) * pageSize
  return props.orders.slice(start, start + pageSize)
})
const visibleRange = computed(() => {
  if (!props.orders.length) return null

  const start = (page.value - 1) * pageSize + 1
  return {
    start,
    end: Math.min(start + pageSize - 1, props.orders.length)
  }
})

watch(orderIds, () => {
  page.value = 1
})

const columns = computed<TableColumn<OrderListItem>[]>(() => {
  const columns: TableColumn<OrderListItem>[] = [{
    accessorKey: 'createdAt',
    header: 'Fecha'
  }, {
    accessorKey: 'orderNumber',
    header: 'Orden'
  }, {
    accessorKey: 'customerName',
    header: props.showCustomer && props.showVehicle
      ? 'Vehículo y cliente'
      : props.showCustomer ? 'Cliente' : 'Vehículo'
  }, {
    accessorKey: 'status',
    header: 'Estado'
  }, {
    accessorKey: 'total',
    header: 'Importe'
  }, {
    accessorKey: 'promisedAt',
    header: 'Entrega'
  }, {
    accessorKey: 'workshopName',
    header: 'Taller'
  }]

  return columns
})
</script>

<template>
  <div>
    <OrdersMobileList
      class="md:hidden"
      :orders="paginatedOrders"
      :loading="loading"
      :show-workshop="showWorkshop"
      :show-customer="showCustomer"
      :show-vehicle="showVehicle"
      :show-created-at="showCreatedAt"
    />

    <UCard class="hidden md:block" :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="paginatedOrders" :columns="columns" :loading="loading">
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
          <div v-if="showCustomer && showVehicle">
            <div class="flex items-center gap-2">
              <p class="font-medium text-highlighted">
                {{ row.original.vehicleLabel }}
              </p>
              <UBadge
                v-if="row.original.licensePlate"
                :label="row.original.licensePlate"
                color="neutral"
                variant="subtle"
                size="sm"
              />
              <span v-else class="text-xs text-muted">Sin placas</span>
            </div>
            <p class="mt-1 text-xs text-muted">
              {{ row.original.customerName }}
            </p>
          </div>
          <div v-else-if="showCustomer">
            <p class="font-medium text-highlighted">
              {{ row.original.customerName }}
            </p>
            <p class="text-xs text-muted">
              {{ formatPhone(row.original.customerPhone) }}
            </p>
          </div>
          <div v-else>
            <div class="flex items-center gap-2">
              <p class="font-medium text-primary">
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
            <UBadge
              v-if="row.original.licensePlate"
              :label="row.original.licensePlate"
              color="neutral"
              variant="subtle"
              size="sm"
              class="mt-1"
            />
            <p v-else class="mt-1 text-xs text-muted">
              Sin placas
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
        <template #promisedAt-cell="{ row }">
          <span class="text-sm">{{ formatDayMonth(row.original.promisedAt) }}</span>
        </template>
        <template #workshopName-cell="{ row }">
          <span v-if="showWorkshop" class="text-sm text-muted">{{ row.original.workshopName }}</span>
          <span v-else>—</span>
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

    <div
      v-if="!loading && orders.length > pageSize"
      class="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p v-if="visibleRange" class="text-sm text-muted" aria-live="polite">
        Mostrando {{ visibleRange.start }}–{{ visibleRange.end }} de {{ orders.length }} órdenes
      </p>
      <UPagination
        v-model:page="page"
        :total="orders.length"
        :items-per-page="pageSize"
        aria-label="Paginación de órdenes"
      />
    </div>
  </div>
</template>
