<script setup lang="ts">
import type { DashboardOverviewData } from '~/types/crm'

const props = defineProps<{ attention?: DashboardOverviewData['attention'], loading?: boolean }>()
const fields = computed(() => [
  { label: 'Entregas atrasadas', value: props.attention?.overdue },
  { label: 'Por autorizar', value: props.attention?.awaitingApproval },
  { label: 'Listas para entregar', value: props.attention?.ready }
])
</script>

<template>
  <DetailCard :ui="{ container: 'min-w-0 lg:flex', wrapper: 'w-full flex-none', body: 'w-full' }">
    <template #title>
      <DetailSectionHeading title="Pendientes actuales" />
    </template>
    <DetailFields :fields="fields" :columns="1" :loading="loading" />
    <UButton
      to="/ordenes"
      label="Revisar órdenes"
      color="neutral"
      variant="outline"
      trailing-icon="i-lucide-arrow-right"
    />
  </DetailCard>
</template>
