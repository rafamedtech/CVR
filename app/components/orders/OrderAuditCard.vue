<script setup lang="ts">
const props = defineProps<{ orderId: string, workshopId: string }>()
const card = useTemplateRef<{ refresh: () => Promise<void> }>('card')
const query = computed(() => ({ orderId: props.orderId }))
defineExpose({ refresh: () => card.value?.refresh() ?? Promise.resolve() })
</script>

<template>
  <AuditHistoryCard
    ref="card"
    :query="query"
    :workshop-id="workshopId"
    description="Altas, cambios y eliminaciones de la orden, sus conceptos, pagos y gastos."
  />
</template>
