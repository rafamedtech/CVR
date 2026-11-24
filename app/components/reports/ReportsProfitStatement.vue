<script setup lang="ts">
import type { ReportMetrics } from '~/types/reports'

defineProps<{ metrics?: ReportMetrics, annual?: boolean, beforeTax?: boolean, loading?: boolean }>()
</script>

<template>
  <ReportsProfitStatementCard
    title="Estado de resultados"
    :description="`De las ventas a la utilidad, con la variación contra el ${annual ? 'año' : 'mes'} anterior.`"
    :caption="`Estado de resultados del ${annual ? 'año' : 'mes'} en pesos mexicanos, ${beforeTax ? 'ventas antes de IVA' : 'con IVA cuando aplica'}`"
    :sales-label="beforeTax ? 'Ventas netas' : 'Ventas de órdenes'"
    :metrics="metrics"
    :annual="annual"
    :loading="loading"
    compact
  />
</template>
