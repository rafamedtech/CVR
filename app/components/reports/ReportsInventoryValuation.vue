<script setup lang="ts">
import type { CarolinaInventoryValuation } from '~/types/reports'

defineProps<{ valuation: CarolinaInventoryValuation | null }>()
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
    <InventoryValuationDetails v-else :valuation="valuation" />
  </DetailCard>
</template>
