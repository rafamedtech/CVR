<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { VehicleListItem } from '~/types/crm'

defineProps<{
  vehicles: VehicleListItem[]
  loading?: boolean
  showWorkshop?: boolean
}>()

const columns: TableColumn<VehicleListItem>[] = [{
  accessorKey: 'licensePlate',
  header: 'Vehículo'
}, {
  accessorKey: 'customerName',
  header: 'Cliente'
}, {
  accessorKey: 'vin',
  header: 'VIN / serie'
}, {
  accessorKey: 'mileage',
  header: 'Kilometraje'
}, {
  accessorKey: 'workshopName',
  header: 'Taller'
}]
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
      <template #mileage-cell="{ row }">
        {{ row.original.mileage?.toLocaleString('es-MX') ?? '—' }}<span v-if="row.original.mileage"> km</span>
      </template>
      <template #workshopName-cell="{ row }">
        <span v-if="showWorkshop" class="text-sm text-muted">{{ row.original.workshopName }}</span>
        <span v-else>—</span>
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
