<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { SortingState } from '@tanstack/table-core'
import { formatDateOnly } from '#shared/date'
import type { FreightListItem } from '~/types/crm'

const props = withDefaults(defineProps<{
  freights: FreightListItem[]
  loading?: boolean
  showWorkshop?: boolean
  pageSize?: number
  returnTo?: string
  hasFilters?: boolean
}>(), { pageSize: 10 })
const showCosts = computed(() => props.freights.some(freight => freight.directCostsMxn !== null))
const emptyMessage = computed(() => props.hasFilters
  ? 'No hay fletes con estos filtros.'
  : 'Los fletes registrados en Transporte aparecerán aquí.')

const sorting = defineModel<SortingState>('sorting', { default: () => [] })
const page = defineModel<number>('page', { default: 1 })

const columns = computed<TableColumn<FreightListItem>[]>(() => [{
  accessorKey: 'serviceDate',
  header: 'Fecha'
}, {
  accessorKey: 'freightNumber',
  header: 'Flete'
}, {
  id: 'route',
  accessorFn: row => `${row.origin} → ${row.destination}`,
  header: 'Ruta y cliente'
}, {
  id: 'status',
  accessorFn: row => freightStatusLabels[row.status],
  header: 'Estado'
}, {
  accessorKey: 'amountMxn',
  header: 'Importe'
}, ...(showCosts.value ? [{ accessorKey: 'directCostsMxn', header: 'Costos directos' }] : []), ...(props.showWorkshop ? [{ accessorKey: 'workshopName', header: 'Negocio' }] : [])])

function detailLink(id: string) {
  return props.returnTo ? { path: `/fletes/${id}`, query: { returnTo: props.returnTo } } : `/fletes/${id}`
}
</script>

<template>
  <ListTable
    v-model:page="page"
    v-model:sorting="sorting"
    :data="freights"
    :columns="columns"
    :get-row-id="row => row.id"
    :page-size="pageSize"
    :loading="loading"
    loading-label="Cargando fletes"
  >
    <template #mobile="{ rows }">
      <div v-if="rows.length" class="space-y-3">
        <ListRecordCard
          v-for="freight in rows"
          :key="freight.id"
          :title="freight.freightNumber"
          :title-to="detailLink(freight.id)"
          :eyebrow="formatDateOnly(freight.serviceDate)"
          summary-label="Importe"
          :summary-value="formatCurrency(freight.amount, freight.currency)"
          summary-color="primary"
        >
          <template #trailing>
            <FreightsFreightStatusBadge :status="freight.status" />
          </template>
          <p class="font-medium break-words text-highlighted">
            {{ freight.origin }} → {{ freight.destination }}
          </p>
          <p class="mt-1 text-xs text-primary">
            {{ freight.customerName }}
          </p>
          <DetailFields
            :fields="[
              { label: 'Nexo', value: freight.sourceFolio ?? freight.sourceRecordId },
              ...(freight.directCostsMxn === null ? [] : [{ label: 'Costos directos', value: formatCurrency(freight.directCostsMxn) }])
            ]"
          />
        </ListRecordCard>
      </div>
      <DetailCard v-else>
        <div class="py-8 text-center">
          <UIcon name="i-lucide-truck" class="mx-auto size-9 text-dimmed" />
          <p class="mt-3 font-medium text-highlighted">
            No hay fletes
          </p>
          <p class="text-sm text-muted">
            {{ emptyMessage }}
          </p>
        </div>
      </DetailCard>
    </template>
    <template #serviceDate-cell="{ row }">
      <span class="text-sm">{{ formatDateOnly(row.original.serviceDate) }}</span>
    </template>
    <template #freightNumber-cell="{ row }">
      <NuxtLink :to="detailLink(row.original.id)" class="font-medium text-primary hover:underline">
        {{ row.original.freightNumber }}
      </NuxtLink>
      <p v-if="row.original.source === 'NEXO'" class="mt-1 text-xs text-muted">
        Nexo · {{ row.original.sourceFolio ?? row.original.sourceRecordId }}
      </p>
    </template>
    <template #route-cell="{ row }">
      <p class="font-medium text-highlighted">
        {{ row.original.origin }} → {{ row.original.destination }}
      </p>
      <p class="mt-1 text-xs text-primary">
        {{ row.original.customerName }}
      </p>
    </template>
    <template #status-cell="{ row }">
      <FreightsFreightStatusBadge :status="row.original.status" />
    </template>
    <template #amountMxn-cell="{ row }">
      <p class="font-semibold text-primary tabular-nums">
        {{ formatCurrency(row.original.amount, row.original.currency) }}
      </p>
      <p v-if="row.original.currency === 'USD'" class="text-xs text-muted tabular-nums">
        {{ formatCurrency(row.original.amountMxn) }} MXN
      </p>
    </template>
    <template #directCostsMxn-cell="{ row }">
      <span class="text-warning tabular-nums">{{ formatCurrency(row.original.directCostsMxn ?? 0) }}</span>
    </template>
    <template #empty>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-truck" class="mx-auto size-9 text-dimmed" />
        <p class="mt-3 font-medium text-highlighted">
          No hay fletes
        </p>
        <p class="text-sm text-muted">
          {{ emptyMessage }}
        </p>
      </div>
    </template>
    <template #pagination>
      <ListPagination
        v-model:page="page"
        :total-results="freights.length"
        :page-size="pageSize"
        label="fletes"
        aria-label="Paginación de fletes"
        hide-single-page
      />
    </template>
  </ListTable>
</template>
