<script setup lang="ts">
import type { CarolinaInventoryValuation } from '~/types/reports'

const props = defineProps<{ valuation: CarolinaInventoryValuation | null }>()
function money(amount: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
}
const warehouses = computed(() => props.valuation?.warehouses ?? [])
</script>

<template>
  <section aria-labelledby="report-inventory" class="min-w-0 space-y-4">
    <DetailSectionHeading
      title-id="report-inventory"
      title="Valor de la mercancía · Carolina Pinturas"
      description="Inventario actual al último costo registrado, incluidas las reservas. No corresponde al cierre del periodo seleccionado. Cada moneda se presenta por separado."
    />
    <UAlert
      v-if="!valuation"
      color="warning"
      icon="i-lucide-unplug"
      title="Inventario no disponible"
      description="No se pudo consultar el valor de la mercancía de Carolina Pinturas. Vuelve a cargar el reporte para reintentar."
    />
    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DetailStatCard
          v-for="total in valuation.totals"
          :key="total.currencyCode"
          :title="`Valor registrado · ${total.currencyCode}`"
          :value="money(total.amount, total.currencyCode)"
          value-color="primary"
          icon="i-lucide-banknote"
        >
          <p class="text-xs text-muted">
            Total de todos los almacenes.
          </p>
        </DetailStatCard>
        <DetailStatCard
          v-if="!valuation.totals.length"
          title="Valor registrado"
          value="Sin importe"
          icon="i-lucide-banknote"
        >
          <p class="text-xs text-muted">
            Aún no hay existencias con costo y moneda registrados.
          </p>
        </DetailStatCard>
        <DetailStatCard title="Productos sin costo" :value="valuation.productsWithoutCost" icon="i-lucide-receipt-text">
          <p class="text-xs text-muted">
            Productos con existencias que requieren costo o moneda.
          </p>
        </DetailStatCard>
      </div>
      <UAlert
        v-if="valuation.productsWithoutCost"
        color="warning"
        icon="i-lucide-circle-alert"
        title="El valor registrado es parcial"
        description="Las existencias sin costo o moneda quedan fuera de los importes. Un mismo producto puede tener costos pendientes en varios almacenes."
      />
      <DetailCard class="min-w-0">
        <DetailSectionHeading title="Distribución por almacén" description="Importes registrados y productos pendientes de valorar en cada ubicación." />
        <ul v-if="warehouses.length" class="divide-y divide-default">
          <li v-for="warehouse in warehouses" :key="warehouse.id" class="space-y-3 py-4 first:pt-0 last:pb-0">
            <h3 class="font-semibold break-words text-highlighted">
              {{ warehouse.name }} <span class="text-xs font-normal text-muted">· {{ warehouse.code }}</span>
            </h3>
            <DetailFields
              :fields="[
                ...(warehouse.totals.length
                  ? warehouse.totals.map(total => ({ label: `Valor · ${total.currencyCode}`, value: money(total.amount, total.currencyCode) }))
                  : [{ label: 'Valor registrado', value: warehouse.productsWithoutCost ? 'Pendiente de costo' : 'Sin importe' }]),
                { label: 'Costos pendientes', value: warehouse.productsWithoutCost }
              ]"
            />
          </li>
        </ul>
        <p v-else class="text-sm text-muted">
          Sin almacenes registrados.
        </p>
      </DetailCard>
    </template>
  </section>
</template>
