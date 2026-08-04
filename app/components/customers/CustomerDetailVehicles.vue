<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { VehicleListItem, WorkshopType } from '~/types/crm'

defineProps<{
  vehicles: VehicleListItem[]
}>()

const columns: TableColumn<VehicleListItem>[] = [{
  accessorKey: 'licensePlate',
  header: 'Vehículo'
}, {
  id: 'workshops',
  header: 'Taller'
}]

const workshopIcons: Record<WorkshopType, string> = {
  BODY_SHOP: 'i-lucide-paintbrush',
  MECHANICAL: 'i-lucide-wrench',
  PAINT_STORE: 'i-lucide-palette'
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <UTable :data="vehicles" :columns="columns">
      <template #licensePlate-cell="{ row }">
        <div>
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/vehiculos/${row.original.id}`"
              class="font-medium text-primary hover:underline"
            >
              {{ row.original.make }} {{ row.original.model }} {{ row.original.year }}
            </NuxtLink>
            <UBadge
              v-if="row.original.color"
              :label="row.original.color"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </div>
          <p class="text-xs text-muted">
            {{ row.original.licensePlate || 'Sin placas' }}
          </p>
        </div>
      </template>
      <template #workshops-cell="{ row }">
        <div
          class="flex items-center gap-1"
          :aria-label="`Talleres asignados a ${row.original.make} ${row.original.model}`"
        >
          <UIcon
            v-for="workshop in row.original.workshops"
            :key="workshop.id"
            :name="workshopIcons[workshop.type]"
            class="size-4"
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
