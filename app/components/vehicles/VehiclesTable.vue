<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { VehicleListItem, WorkshopType } from '~/types/crm'

defineProps<{
  vehicles: VehicleListItem[]
  loading?: boolean
  canEdit?: boolean
  canAssignWorkshops?: boolean
}>()
const emit = defineEmits<{
  edit: [vehicle: VehicleListItem]
  assignWorkshops: [vehicle: VehicleListItem]
}>()

const workshopIcons: Record<WorkshopType, string> = {
  BODY_SHOP: 'i-lucide-paintbrush',
  MECHANICAL: 'i-lucide-wrench',
  PAINT_STORE: 'i-lucide-palette'
}

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

  return [
    ...baseColumns.slice(0, -1),
    { id: 'workshops', header: 'Taller' },
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
      <template #vin-cell="{ row }">
        <span class="font-mono text-xs text-muted">{{ row.original.vin || '—' }}</span>
      </template>
      <template #workshops-cell="{ row }">
        <UButton
          v-if="canAssignWorkshops"
          color="neutral"
          variant="ghost"
          size="sm"
          class="w-14 justify-center"
          :aria-label="`Editar talleres de ${row.original.make} ${row.original.model}`"
          @click="emit('assignWorkshops', row.original)"
        >
          <UIcon
            v-for="workshop in row.original.workshops"
            :key="workshop.id"
            :name="workshopIcons[workshop.type]"
            class="size-4"
          />
        </UButton>
        <div
          v-else
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
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            label="Editar"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="!canEdit"
            @click="emit('edit', row.original)"
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
