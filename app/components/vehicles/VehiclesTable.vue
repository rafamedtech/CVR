<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { VehicleListItem } from '~/types/crm'

const props = defineProps<{
  vehicles: VehicleListItem[]
  loading?: boolean
  showWorkshop?: boolean
  canAssignWorkshops?: boolean
}>()
const emit = defineEmits<{
  assignWorkshops: [vehicle: VehicleListItem]
}>()

const columns = computed<TableColumn<VehicleListItem>[]>(() => {
  const baseColumns: TableColumn<VehicleListItem>[] = [{
    accessorKey: 'licensePlate',
    header: 'Vehículo'
  }, {
    accessorKey: 'customerName',
    header: 'Cliente'
  }, {
    accessorKey: 'vin',
    header: 'VIN / serie'
  }, {
    id: 'actions'
  }]

  if (!props.showWorkshop) return baseColumns

  return [
    ...baseColumns.slice(0, -1),
    { id: 'workshops', header: 'Talleres' },
    baseColumns.at(-1)!
  ]
})
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <UTable :data="vehicles" :columns="columns" :loading="loading">
      <template #licensePlate-cell="{ row }">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-medium text-highlighted">{{ row.original.licensePlate }}</span>
            <UBadge
              v-if="row.original.color"
              :label="row.original.color"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </div>
          <p class="text-xs text-muted">
            {{ row.original.make }} {{ row.original.model }} {{ row.original.year }}
          </p>
        </div>
      </template>
      <template #vin-cell="{ row }">
        <span class="font-mono text-xs text-muted">{{ row.original.vin || '—' }}</span>
      </template>
      <template #workshops-cell="{ row }">
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="workshop in row.original.workshops"
            :key="workshop.id"
            :label="workshop.name"
            color="neutral"
            variant="subtle"
          />
        </div>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UButton
            v-if="canAssignWorkshops"
            label="Asignar talleres"
            icon="i-lucide-building-2"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emit('assignWorkshops', row.original)"
          />
        </div>
      </template>
      <template #empty>
        <div class="py-12 text-center">
          <UIcon name="i-lucide-car-front" class="mx-auto size-9 text-dimmed" />
          <p class="mt-3 font-medium text-highlighted">
            No hay vehículos
          </p>
          <p class="text-sm text-muted">
            Registra el primero para crear órdenes de trabajo.
          </p>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
