<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ConsolidationInfo } from '~/types/reports'

const props = defineProps<{ info: ConsolidationInfo, month: string, annual: boolean }>()
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
        <h2 id="report-businesses" class="font-semibold text-highlighted">
          Resultados por negocio
        </h2>
        <p class="mt-1 text-xs text-muted">
          Ventas antes de IVA. Cobros y saldos conservan los importes registrados.
        </p>
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
    <DetailCard :ui="{ container: 'min-w-0 p-0 sm:p-0' }">
      <DetailTable
        :data="info.businesses"
        :columns="columns"
        :get-row-id="row => row.id"
        caption="Resultados por negocio en pesos mexicanos"
        :ui="{ caption: 'sr-only', th: 'whitespace-nowrap', td: 'tabular-nums whitespace-nowrap' }"
      >
        <template #sales-cell="{ row }">
          {{ formatCurrency(row.original.metrics.sales) }}
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
        <h3 class="font-semibold text-highlighted">
          Operaciones internas incluidas
        </h3>
        <p class="mt-1 text-xs text-muted">
          Se muestran por separado y permanecen en los totales. Los clientes internos usan la clasificación de Carolina; los insumos se identifican por el proveedor registrado en los talleres.
        </p>
      </div>
      <DetailFields
        :columns="4"
        :fields="[
          { key: 'sales', label: 'Ventas a clientes internos', value: formatCurrency(info.internalOperations.sales) },
          { key: 'count', label: 'Pedidos internos', value: info.internalOperations.orderCount },
          { key: 'collections', label: 'Cobros a clientes internos', value: formatCurrency(info.internalOperations.collections) },
          { key: 'material', label: 'Insumos de talleres pagados a Carolina', value: formatCurrency(info.internalOperations.workshopMaterialPurchases) }
        ]"
      />
    </DetailCard>
  </section>
</template>
