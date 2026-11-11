<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { DashboardActivityItem } from '~/types/crm'

const props = defineProps<{
  items: DashboardActivityItem[]
  canViewFinancials: boolean
  timeZone: string
}>()

const selected = ref<'all' | DashboardActivityItem['type']>('all')
const isMobileViewport = useMobileViewport()
const categories = computed(() => [
  { value: 'all' as const, label: 'Toda la actividad' },
  { value: 'order' as const, label: 'Órdenes' },
  { value: 'customer' as const, label: 'Clientes' },
  { value: 'vehicle' as const, label: 'Vehículos' },
  ...(props.canViewFinancials ? [{ value: 'payment' as const, label: 'Pagos' }, { value: 'expense' as const, label: 'Gastos' }] : [])
])
const types = {
  order: 'Orden actualizada',
  customer: 'Nuevo cliente',
  vehicle: 'Nuevo vehículo',
  payment: 'Pago recibido',
  expense: 'Gasto registrado'
}
const visibleItems = computed(() => props.items
  .filter(item => props.canViewFinancials || (item.type !== 'payment' && item.type !== 'expense'))
  .filter(item => selected.value === 'all' || item.type === selected.value)
  .slice(0, 12))
const columns = computed<TableColumn<DashboardActivityItem>[]>(() => [
  { accessorKey: 'title', header: 'Movimiento' },
  ...(!isMobileViewport.value ? [{ id: 'assignment', header: 'Asignación' }, { id: 'details', header: 'Detalle' }] : [])
])
</script>

<template>
  <DetailCard :ui="{ container: 'min-w-0 lg:flex', wrapper: 'w-full flex-none', body: 'w-full' }">
    <template #title>
      <DetailSectionHeading title="Últimos movimientos" description="Actividad de los últimos 7 días.">
        <template #actions>
          <USelect
            v-model="selected"
            :items="categories"
            aria-label="Filtrar actividad por tipo"
            class="w-full sm:w-48"
          />
        </template>
      </DetailSectionHeading>
    </template>
    <DetailTable
      :data="visibleItems"
      :columns="columns"
      empty="Sin movimientos recientes en esta categoría"
      :get-row-id="item => item.id"
    >
      <template #title-cell="{ row }">
        <div class="space-y-1 whitespace-normal">
          <p class="text-xs text-muted">
            {{ types[row.original.type] }}
          </p>
          <NuxtLink
            v-if="row.original.type !== 'order' && (row.original.type !== 'vehicle' || isMobileViewport)"
            :to="row.original.to"
            class="font-medium text-primary hover:underline"
          >
            {{ row.original.title }}
          </NuxtLink>
          <p v-if="row.original.customerName" class="font-medium text-primary">
            {{ row.original.customerName }}
          </p>
          <p
            v-if="(row.original.vehicleLabel || !row.original.customerName) && !(row.original.type === 'expense' && row.original.description === 'Gasto registrado')"
            class="text-xs text-muted"
          >
            {{ row.original.vehicleLabel ?? row.original.description }}
          </p>
          <ExpensesAssignment
            v-if="isMobileViewport && (row.original.order || row.original.type === 'expense')"
            :order="row.original.order ?? null"
            :show-details="false"
            :label="row.original.type === 'expense' ? 'Tipo de gasto' : undefined"
          />
          <DashboardActivityDetails
            v-if="isMobileViewport"
            :item="row.original"
            :can-view-financials="canViewFinancials"
            :time-zone="timeZone"
          />
        </div>
      </template>
      <template #assignment-cell="{ row }">
        <ExpensesAssignment
          v-if="row.original.order || row.original.type === 'expense'"
          :order="row.original.order ?? null"
          :show-details="false"
          :label="row.original.type === 'expense' ? 'Tipo de gasto' : undefined"
        />
        <div v-else-if="row.original.type === 'vehicle'" class="whitespace-normal">
          <p class="text-xs text-muted">
            Vehículo
          </p>
          <NuxtLink :to="row.original.to" class="font-medium text-primary hover:underline">
            {{ row.original.title }}
          </NuxtLink>
        </div>
        <span v-else class="text-muted">—</span>
      </template>
      <template #details-cell="{ row }">
        <DashboardActivityDetails :item="row.original" :can-view-financials="canViewFinancials" :time-zone="timeZone" />
      </template>
    </DetailTable>
  </DetailCard>
</template>
