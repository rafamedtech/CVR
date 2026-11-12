<script setup lang="ts">
import type { CarolinaInventoryValuation } from '~/types/reports'

const props = defineProps<{ valuation: CarolinaInventoryValuation | null }>()
function money(amount: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
}
const warehouses = computed(() => props.valuation?.warehouses ?? [])
</script>

<template>
  <DetailCard
    class="min-w-0"
    :ui="{ container: 'min-w-0 justify-start lg:flex', wrapper: 'flex-none' }"
    icon="i-lucide-warehouse"
    aria-labelledby="report-inventory"
  >
    <template #title>
      <DetailSectionHeading
        title-id="report-inventory"
        title="Valor de la mercancía · Carolina Pinturas"
        description="Inventario actual al último costo registrado, incluidas las reservas."
        :ui="{ title: 'text-lg' }"
      />
    </template>
    <UAlert
      v-if="!valuation"
      color="warning"
      icon="i-lucide-unplug"
      title="Inventario no disponible"
      description="No se pudo consultar el valor de la mercancía de Carolina Pinturas. Vuelve a cargar el reporte para reintentar."
    />
    <template v-else>
      <div class="grid gap-4 lg:grid-cols-3">
        <DetailCard
          title="Valor registrado"
          icon="i-lucide-banknote"
          variant="soft"
          :ui="{ container: 'gap-y-4 p-4 sm:p-5', title: 'text-xs font-normal text-muted uppercase' }"
        >
          <dl v-if="valuation.totals.length" class="space-y-4">
            <div v-for="total in valuation.totals" :key="total.currencyCode">
              <dt class="text-xs font-medium text-muted">
                {{ total.currencyCode }}
              </dt>
              <dd class="mt-1 text-2xl font-semibold break-words text-primary tabular-nums">
                {{ money(total.amount, total.currencyCode) }}
              </dd>
            </div>
          </dl>
          <p v-else class="text-lg font-semibold text-highlighted">
            Sin importe
          </p>
          <p class="text-xs text-muted">
            {{ valuation.totals.length ? 'Total de todos los almacenes, por moneda.' : 'Aún no hay existencias con costo y moneda registrados.' }}
          </p>
        </DetailCard>
        <DetailCard
          class="min-w-0 lg:col-span-2"
          title="Distribución por almacén"
          icon="i-lucide-warehouse"
          variant="soft"
          :ui="{ container: 'gap-y-4 p-4 sm:p-5', title: 'text-xs font-normal text-muted uppercase' }"
        >
          <dl v-if="warehouses.length" class="divide-y divide-default text-sm">
            <div v-for="warehouse in warehouses" :key="warehouse.id" class="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-6">
              <dt class="min-w-0 font-medium break-words text-highlighted">
                {{ warehouse.name }}
              </dt>
              <dd class="flex flex-wrap gap-x-6 gap-y-2 font-medium tabular-nums sm:justify-end sm:text-right">
                <template v-if="warehouse.totals.length">
                  <span v-for="total in warehouse.totals" :key="total.currencyCode" class="min-w-28">
                    <span class="mr-1 text-xs font-normal text-muted">{{ total.currencyCode }}</span>
                    {{ money(total.amount, total.currencyCode) }}
                  </span>
                </template>
                <span v-else>{{ warehouse.productsWithoutCost ? 'Sin costo' : 'Sin importe' }}</span>
              </dd>
            </div>
          </dl>
          <p v-else class="text-sm text-muted">
            Sin almacenes registrados.
          </p>
        </DetailCard>
      </div>
      <UAlert
        v-if="valuation.productsWithoutCost"
        color="warning"
        icon="i-lucide-circle-alert"
        title="El valor registrado es parcial"
        description="Las existencias sin costo o moneda quedan fuera de los importes. Un mismo producto puede tener costos pendientes en varios almacenes."
      />
    </template>
  </DetailCard>
</template>
