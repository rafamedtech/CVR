<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OrderListItem } from '~/types/crm'
import OrdersMobileList from './OrdersMobileList.vue'

const { workshopTimeZone } = useCrmSession()

const props = withDefaults(defineProps<{
  orders: OrderListItem[]
  loading?: boolean
  showWorkshop?: boolean
  showCustomer?: boolean
  showVehicle?: boolean
  showCreatedAt?: boolean
  pageSize?: number
  returnTo?: string
}>(), {
  showCustomer: true,
  showVehicle: true,
  pageSize: 10
})

const pageModel = defineModel<number>('page')
const localPage = shallowRef(1)
const page = computed({
  get: () => pageModel.value ?? localPage.value,
  set: (value) => {
    if (pageModel.value === undefined) localPage.value = value
    else pageModel.value = value
  }
})
const orderIds = computed(() => props.orders.map(order => order.id).join(','))
const paginatedOrders = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return props.orders.slice(start, start + props.pageSize)
})
watch(orderIds, () => {
  if (pageModel.value === undefined) localPage.value = 1
})

const columns = computed<TableColumn<OrderListItem>[]>(() => {
  const columns: TableColumn<OrderListItem>[] = [...(props.showCreatedAt
    ? [{
        accessorKey: 'createdAt',
        header: 'Fecha'
      }]
    : []), {
    accessorKey: 'orderNumber',
    header: 'Orden'
  }, {
    accessorKey: 'customerName',
    header: props.showCustomer && props.showVehicle
      ? 'Vehículo y cliente'
      : props.showCustomer ? 'Cliente' : 'Vehículo'
  }, {
    accessorKey: 'assignedToName',
    header: 'Responsable'
  }, {
    accessorKey: 'status',
    header: 'Estado'
  }, {
    accessorKey: 'total',
    header: 'Importe'
  }, {
    accessorKey: 'promisedAt',
    header: 'Entrega'
  }, ...(props.showWorkshop
    ? [{
        accessorKey: 'workshopName',
        header: 'Taller'
      }]
    : [])]

  return columns
})
</script>

<template>
  <div>
    <ListLoading :loading="loading" class="sr-only" label="Cargando órdenes de trabajo" />
    <OrdersMobileList
      class="md:hidden"
      :orders="paginatedOrders"
      :loading="loading"
      :show-workshop="showWorkshop"
      :show-customer="showCustomer"
      :show-vehicle="showVehicle"
      :show-created-at="showCreatedAt"
      :return-to="returnTo"
      show-promised-at
    />

    <UCard class="hidden md:block" :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        :data="paginatedOrders"
        :columns="columns"
        :loading="loading"
        :ui="{ thead: 'motion-reduce:after:animate-none', loading: 'p-0' }"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-sm">{{ formatDate(row.original.createdAt, false, workshopTimeZone(row.original.workshopId)) }}</span>
        </template>
        <template #orderNumber-cell="{ row }">
          <div>
            <NuxtLink
              :to="{ path: `/ordenes/${row.original.id}`, query: returnTo ? { returnTo } : undefined }"
              class="font-medium text-primary hover:underline"
            >
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
            <p class="mt-1 text-xs text-primary">
              {{ row.original.customerName }}
            </p>
          </div>
          <div v-else-if="showCustomer">
            <p class="font-medium text-primary">
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
        <template #assignedToName-cell="{ row }">
          <span class="text-sm">{{ row.original.assignedToName || 'Sin responsable asignado' }}</span>
        </template>
        <template #status-cell="{ row }">
          <OrdersStatusBadge :status="row.original.status" />
        </template>
        <template #total-cell="{ row }">
          <span class="font-semibold text-primary tabular-nums">{{ formatCurrency(row.original.total) }}</span>
        </template>
        <template #promisedAt-cell="{ row }">
          <span class="text-sm">{{ formatDayMonth(row.original.promisedAt, workshopTimeZone(row.original.workshopId)) }}</span>
        </template>
        <template #workshopName-cell="{ row }">
          <OrdersWorkshopBadge :order="row.original" />
        </template>
        <template #loading>
          <ListLoading
            label="Cargando datos…"
            size="md"
            variant="table"
            :announce="false"
          />
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

    <ListPagination
      v-if="!loading"
      v-model:page="page"
      :total-results="orders.length"
      :page-size="pageSize"
      label="órdenes"
      aria-label="Paginación de órdenes"
      hide-single-page
      class="mt-4"
    />
  </div>
</template>
