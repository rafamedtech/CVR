<script setup lang="ts">
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
</script>

<template>
  <div v-if="loading" class="space-y-3" aria-hidden="true">
    <UCard v-for="index in 3" :key="index">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 space-y-2">
            <USkeleton class="motion-reduce:animate-none h-5 w-2/3" />
            <USkeleton class="motion-reduce:animate-none h-3 w-1/3" />
          </div>
          <USkeleton class="motion-reduce:animate-none size-8" />
        </div>
        <USkeleton class="motion-reduce:animate-none h-12 w-full" />
        <USkeleton class="motion-reduce:animate-none h-8 w-full" />
      </div>
    </UCard>
  </div>

  <div v-else-if="vehicles.length" class="space-y-3">
    <ListRecordCard
      v-for="vehicle in vehicles"
      :key="vehicle.id"
      :title="`${vehicle.make} ${vehicle.model} ${vehicle.year}`"
      :title-to="`/vehiculos/${vehicle.id}`"
    >
      <template #title-extra>
        <div class="mt-0.5 flex items-center gap-2">
          <p class="text-xs text-muted">
            {{ vehicle.licensePlate || 'Sin placas' }}
          </p>
          <UBadge
            v-if="vehicle.color"
            :label="vehicle.color"
            icon="i-lucide-palette"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
      </template>

      <template #actions>
        <UButton
          icon="i-lucide-pencil"
          label="Editar"
          color="neutral"
          variant="ghost"
          :disabled="!canEdit"
          :aria-label="`Editar ${vehicle.make} ${vehicle.model}`"
          @click="emit('edit', vehicle)"
        />
      </template>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-muted pt-3">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              :to="`/clientes/${vehicle.customerId}`"
              :aria-label="`Ver cliente ${vehicle.customerName}`"
              class="inline-flex rounded-md"
            >
              <UBadge
                :label="vehicle.customerName"
                icon="i-lucide-user-round"
                color="primary"
                variant="subtle"
              />
            </NuxtLink>
          </div>

          <UButton
            v-if="canAssignWorkshops"
            color="neutral"
            variant="ghost"
            class="shrink-0"
            :aria-label="`Editar talleres de ${vehicle.make} ${vehicle.model}`"
            @click="emit('assignWorkshops', vehicle)"
          >
            <span class="flex items-center gap-1.5">
              <UIcon
                v-for="workshop in vehicle.workshops"
                :key="workshop.id"
                :name="workshopIcons[workshop.type]"
                class="size-4"
              />
            </span>
          </UButton>
          <div
            v-else
            class="flex shrink-0 items-center gap-1.5"
            :aria-label="`Talleres asignados a ${vehicle.make} ${vehicle.model}`"
          >
            <UIcon
              v-for="workshop in vehicle.workshops"
              :key="workshop.id"
              :name="workshopIcons[workshop.type]"
              class="size-4"
            />
          </div>
        </div>
      </template>
    </ListRecordCard>
  </div>

  <UCard v-else>
    <div class="py-8 text-center">
      <UIcon name="i-lucide-car-front" class="mx-auto size-9 text-dimmed" />
      <p class="mt-3 font-medium text-highlighted">
        No hay vehículos
      </p>
      <p class="text-sm text-muted">
        Registra el primero para crear órdenes de trabajo.
      </p>
    </div>
  </UCard>
</template>
