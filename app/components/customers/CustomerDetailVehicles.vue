<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { VehicleListItem } from '~/types/crm'

defineProps<{
  vehicles: VehicleListItem[]
}>()

const columns: TableColumn<VehicleListItem>[] = [{
  accessorKey: 'licensePlate',
  header: 'Vehículo'
}, {
  accessorKey: 'vin',
  header: 'VIN / serie'
}, {
  accessorKey: 'mileage',
  header: 'Kilometraje'
}]
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <UTable :data="vehicles" :columns="columns">
      <template #licensePlate-cell="{ row }">
        <div>
          <p class="font-medium text-highlighted">
            {{ row.original.licensePlate }}
          </p>
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
      <template #empty>
        <div class="py-12 text-center">
          <UIcon name="i-lucide-car-front" class="mx-auto size-9 text-dimmed" />
          <p class="mt-3 font-medium text-highlighted">
            No hay vehículos registrados
          </p>
          <p class="text-sm text-muted">
            Agrega un vehículo desde catálogo de vehículos.
          </p>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
