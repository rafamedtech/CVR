<script setup lang="ts">
import type { ConsolidationInfo, ReportSalesChannel } from '~/types/reports'
import { groupBusinessSalesChannels } from '#shared/report-sales-channels'

const props = defineProps<{
  channels: ReportSalesChannel[]
  businesses: ConsolidationInfo['businesses']
}>()
const groups = computed(() => groupBusinessSalesChannels(props.channels, props.businesses))
</script>

<template>
  <section aria-labelledby="business-sales-channels" class="space-y-3">
    <h3 id="business-sales-channels" class="font-semibold text-highlighted">
      Ventas por canal
    </h3>
    <div class="grid min-w-0 gap-4 xl:grid-cols-2">
      <ReportsSalesChannels
        id="carolina-sales-channels"
        title="Carolina Pinturas"
        description="Participación de mostrador, vendedor y clientes internos en las ventas de Carolina."
        :channels="groups.carolina"
        compact
      />
      <ReportsSalesChannels
        id="workshop-sales-channels"
        title="Talleres"
        description="Participación de cada taller en las ventas de Carrocería y Mecánica."
        :channels="groups.workshops"
        compact
      />
    </div>
  </section>
</template>
