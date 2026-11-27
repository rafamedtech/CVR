<script setup lang="ts">
import type { AuditEventView } from '#shared/audit'

const props = defineProps<{ orderId: string, workshopId: string }>()
const { workshopTimeZone } = useCrmSession()
const { data: events, status, error, refresh } = useFetch<AuditEventView[]>('/api/audit', {
  query: computed(() => ({ orderId: props.orderId })),
  lazy: true,
  server: false
})
defineExpose({ refresh })

const entityLabels: Record<string, string> = {
  service_order: 'Orden',
  order_item: 'Concepto',
  payment: 'Pago',
  expense: 'Gasto'
}
const actionLabels: Record<string, { label: string, icon: string, color: string }> = {
  create: { label: 'registrado', icon: 'i-lucide-circle-plus', color: 'text-success' },
  update: { label: 'modificado', icon: 'i-lucide-pencil', color: 'text-info' },
  delete: { label: 'eliminado', icon: 'i-lucide-trash-2', color: 'text-error' }
}
// Solo muestra el esqueleto en la primera carga; los refrescos conservan la lista.
const loading = computed(() => !events.value && status.value !== 'error')
</script>

<template>
  <DetailCard class="min-w-0" :ui="{ container: 'min-w-0 justify-start', wrapper: 'flex-none' }">
    <template #title>
      <DetailSectionHeading title="Historial de cambios" color="primary" description="Altas, cambios y eliminaciones de la orden, sus conceptos, pagos y gastos.">
        <template #leading>
          <UIcon name="i-lucide-history" class="size-5 shrink-0" />
        </template>
      </DetailSectionHeading>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
      role="status"
      aria-busy="true"
    >
      <span class="sr-only">Cargando historial</span>
      <USkeleton v-for="index in 3" :key="index" class="h-10 w-full" />
    </div>
    <UAlert
      v-else-if="error && !events"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="No se pudo cargar el historial."
    >
      <template #actions>
        <UButton
          label="Reintentar"
          color="error"
          variant="soft"
          @click="refresh()"
        />
      </template>
    </UAlert>
    <p v-else-if="!events?.length" class="text-sm text-muted">
      Sin cambios registrados desde que se activó el historial.
    </p>
    <ol v-else class="space-y-4">
      <li v-for="event in events" :key="event.id" class="flex gap-3">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated">
          <UIcon :name="actionLabels[event.action]?.icon ?? 'i-lucide-circle'" class="size-4" :class="actionLabels[event.action]?.color" />
        </span>
        <div class="min-w-0 text-sm">
          <p class="font-medium text-highlighted">
            {{ entityLabels[event.entityType] ?? event.entityType }} {{ actionLabels[event.action]?.label ?? event.action }}
          </p>
          <p class="flex flex-wrap gap-x-1 text-muted">
            <span>{{ formatDate(event.createdAt, true, workshopTimeZone(workshopId)) }} ·</span>
            <span class="break-all">{{ event.actorEmail }}</span>
            <span v-if="event.switchedFromId">(cambio de usuario)</span>
          </p>
          <p v-if="event.reason" class="mt-1 text-muted italic">
            “{{ event.reason }}”
          </p>
        </div>
      </li>
    </ol>
  </DetailCard>
</template>
