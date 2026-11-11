<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ConsolidationInfo } from '~/types/reports'

const props = defineProps<{ info: ConsolidationInfo, month: string, annual: boolean, carolinaOnly?: boolean }>()
type Business = ConsolidationInfo['businesses'][number]
const columns: TableColumn<Business>[] = [
  { accessorKey: 'name', header: 'Negocio' },
  { id: 'sales', header: 'Ventas netas' },
  { id: 'material', header: 'Material' },
  { id: 'operating', header: 'Operación' },
  { id: 'profit', header: 'Utilidad neta' },
  { id: 'collections', header: 'Cobrado' }
]
const carolinaUrl = computed(() => `https://carolina-pinturas.vercel.app/reportes?month=${props.month}${props.annual ? '&view=annual' : ''}`)
</script>

<template>
  <section aria-labelledby="report-businesses" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="report-businesses" class="text-xl font-semibold text-highlighted">
          {{ carolinaOnly ? 'Detalle de Carolina Pinturas' : 'Resultados por negocio' }}
        </h2>
      </div>
      <UButton
        :to="carolinaUrl"
        target="_blank"
        icon="i-lucide-external-link"
        color="neutral"
        variant="outline"
        label="Reporte de Carolina"
      />
    </div>
    <DetailCard v-if="!carolinaOnly" :ui="{ container: 'min-w-0 p-0 sm:p-0' }">
      <DetailTable
        :data="info.businesses"
        :columns="columns"
        :get-row-id="row => row.id"
        caption="Resultados por negocio en pesos mexicanos"
        :ui="{ caption: 'sr-only', th: 'whitespace-nowrap', td: 'tabular-nums whitespace-nowrap' }"
      >
        <template #sales-cell="{ row }">
          <span class="font-bold">{{ formatCurrency(row.original.metrics.sales) }}</span>
        </template>
        <template #material-cell="{ row }">
          {{ formatCurrency(row.original.metrics.materialPurchases) }}
        </template>
        <template #operating-cell="{ row }">
          {{ formatCurrency(row.original.metrics.operatingExpenses) }}
        </template>
        <template #profit-cell="{ row }">
          <span class="font-semibold" :class="row.original.metrics.netProfit < 0 ? 'text-error' : 'text-success'">{{ formatCurrency(row.original.metrics.netProfit) }}</span>
        </template>
        <template #collections-cell="{ row }">
          {{ formatCurrency(row.original.metrics.collections) }}
        </template>
      </DetailTable>
    </DetailCard>
    <DetailCard v-if="info.internalOperations" :ui="{ container: 'gap-4' }">
      <div>
        <h3 class="text-lg font-semibold text-highlighted">
          Operaciones internas incluidas
        </h3>
      </div>
      <DetailFields
        :columns="4"
        :fields="[
          { key: 'sales', label: 'Ventas a clientes internos', value: formatCurrency(info.internalOperations.sales) },
          { key: 'count', label: 'Pedidos internos', value: info.internalOperations.orderCount },
          { key: 'collections', label: 'Cobros a clientes internos', value: formatCurrency(info.internalOperations.collections) },
          carolinaOnly ? { key: 'balance', label: 'Saldo de clientes internos', value: formatCurrency(info.internalOperations.outstandingBalance) } : { key: 'material', label: 'Insumos de talleres pagados a Carolina', value: formatCurrency(info.internalOperations.workshopMaterialPurchases) }
        ]"
      />
    </DetailCard>
  </section>
</template>
