<script setup lang="ts">
import type { OrderDetail } from '~/types/crm'

const props = defineProps<{ order: OrderDetail }>()
const fields = computed(() => [
  { key: 'created', label: 'Fecha de la orden', value: formatDate(props.order.createdAt) },
  { key: 'complaint', label: 'Servicio solicitado', value: props.order.complaint },
  { key: 'intake', label: 'Condiciones de recepción', value: props.order.intakeNotes || 'Sin observaciones' },
  { key: 'notes', label: 'Notas internas', value: props.order.internalNotes || 'Sin notas internas' }
])
</script>

<template>
  <DetailCard class="min-w-0" :ui="{ container: 'min-w-0 justify-start', wrapper: 'flex-none' }">
    <template #title>
      <DetailSectionHeading title="Recepción" color="primary" description="Información y condiciones de ingreso del vehículo.">
        <template #leading>
          <UIcon name="i-lucide-clipboard-list" class="size-5 shrink-0" />
        </template>
      </DetailSectionHeading>
    </template>
    <DetailFields :fields="fields" class="grid-cols-1 sm:grid-cols-2 xl:grid-cols-2">
      <template #value="{ field }">
        <span class="whitespace-pre-wrap text-sm leading-relaxed text-highlighted">{{ field.value }}</span>
      </template>
    </DetailFields>
  </DetailCard>
</template>
