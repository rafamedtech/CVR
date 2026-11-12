<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ConsolidationInfo } from '~/types/reports'

defineProps<{ info: ConsolidationInfo, month: string, annual: boolean, carolinaOnly?: boolean }>()
type Business = ConsolidationInfo['businesses'][number]
const columns: TableColumn<Business>[] = [
  { accessorKey: 'name', header: 'Negocio' },
  { id: 'sales', header: 'Ventas netas' },
  { id: 'material', header: 'Material' },
  { id: 'operating', header: 'Operación' },
  { id: 'profit', header: 'Utilidad neta' },
  { id: 'collections', header: 'Cobrado' }
]
</script>

<template>
  <section aria-labelledby="report-businesses" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="report-businesses" class="text-xl font-semibold text-highlighted">
          {{ carolinaOnly ? 'Detalle de Carolina Pinturas' : 'Resultados por negocio' }}
        </h2>
      </div>
    </div>
    <DetailCard v-if="!carolinaOnly" :ui="{ container: 'min-w-0 p-0 sm:p-0' }">
      <ul v-if="info.businesses.length" aria-label="Resultados por negocio en pesos mexicanos" class="min-w-0 divide-y divide-default md:hidden">
        <li v-for="business in info.businesses" :key="business.id" class="min-w-0 p-4">
          <h3 class="font-semibold break-words text-highlighted">
            {{ business.name }}
          </h3>
          <dl class="mt-4 grid min-w-0 grid-cols-2 gap-x-4 gap-y-4">
            <div class="min-w-0">
              <dt class="text-xs text-muted">
                Ventas netas
              </dt>
              <dd class="mt-1 text-base font-semibold break-words text-highlighted tabular-nums">
                {{ formatCurrency(business.metrics.sales) }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-muted">
                Cobrado
              </dt>
              <dd class="mt-1 text-base font-semibold break-words text-highlighted tabular-nums">
                {{ formatCurrency(business.metrics.collections) }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-muted">
                Material
              </dt>
              <dd class="mt-1 text-sm break-words text-default tabular-nums">
                {{ formatCurrency(business.metrics.materialPurchases) }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-muted">
                Operación
              </dt>
              <dd class="mt-1 text-sm break-words text-default tabular-nums">
                {{ formatCurrency(business.metrics.operatingExpenses) }}
              </dd>
            </div>
            <div class="col-span-full min-w-0 rounded-lg px-3 py-2.5" :class="business.metrics.netProfit < 0 ? 'bg-error/10' : 'bg-success/10'">
              <dt class="text-xs text-muted">
                Utilidad neta
              </dt>
              <dd class="mt-1 text-lg font-semibold break-words tabular-nums" :class="business.metrics.netProfit < 0 ? 'text-error' : 'text-success'">
                {{ formatCurrency(business.metrics.netProfit) }}
              </dd>
            </div>
          </dl>
        </li>
      </ul>
      <UEmpty
        v-else
        title="Sin registros"
        icon="i-lucide-inbox"
        variant="naked"
        class="py-10 md:hidden"
      />
      <DetailTable
        class="hidden md:block"
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
    <ReportsInventoryValuation
      v-if="info.carolinaInventory !== undefined"
      :valuation="info.carolinaInventory"
    />
  </section>
</template>
