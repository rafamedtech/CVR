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
}]
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <UTable :data="vehicles" :columns="columns">
      <template #licensePlate-cell="{ row }">
        <div>
          <NuxtLink
            :to="`/vehiculos/${row.original.id}`"
            class="font-medium text-primary hover:underline"
          >
            {{ row.original.licensePlate || 'Sin placas' }}
          </NuxtLink>
          <p class="text-xs text-muted">
            {{ row.original.make }} {{ row.original.model }} {{ row.original.year }}
          </p>
        </div>
      </template>
      <template #vin-cell="{ row }">
        <span class="font-mono text-xs text-muted">{{ row.original.vin || '—' }}</span>
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
