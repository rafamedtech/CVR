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
  <div v-if="loading" class="space-y-3" aria-label="Cargando vehículos">
    <UCard v-for="index in 3" :key="index">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 space-y-2">
            <USkeleton class="h-5 w-2/3" />
            <USkeleton class="h-3 w-1/3" />
          </div>
          <USkeleton class="size-8" />
        </div>
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-8 w-full" />
      </div>
    </UCard>
  </div>

  <div v-else-if="vehicles.length" class="space-y-3">
    <UCard
      v-for="vehicle in vehicles"
      :key="vehicle.id"
      :ui="{ body: 'p-4 sm:p-4' }"
    >
      <article :aria-labelledby="`vehicle-${vehicle.id}`">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <NuxtLink
              :id="`vehicle-${vehicle.id}`"
              :to="`/vehiculos/${vehicle.id}`"
              class="font-semibold text-primary hover:underline"
            >
              {{ vehicle.make }} {{ vehicle.model }} {{ vehicle.year }}
            </NuxtLink>
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
          </div>

          <UButton
            icon="i-lucide-pencil"
            label="Editar"
            color="neutral"
            variant="ghost"
            :disabled="!canEdit"
            :aria-label="`Editar ${vehicle.make} ${vehicle.model}`"
            @click="emit('edit', vehicle)"
          />
        </div>

        <div class="mt-4 flex items-center justify-between gap-3 border-t border-muted pt-3">
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
      </article>
    </UCard>
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
