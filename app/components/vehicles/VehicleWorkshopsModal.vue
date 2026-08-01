<script setup lang="ts">
import type { VehicleListItem, WorkshopSummary } from '~/types/crm'

const props = defineProps<{
  vehicle: VehicleListItem | null
  workshops: readonly WorkshopSummary[]
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ updated: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const selectedWorkshopIds = shallowRef<string[]>([])

watch([open, () => props.vehicle], ([isOpen, vehicle]) => {
  if (!isOpen || !vehicle) return
  selectedWorkshopIds.value = vehicle.workshops.map(workshop => workshop.id)
}, { immediate: true })

function toggleWorkshop(workshopId: string, selected: boolean) {
  selectedWorkshopIds.value = selected
    ? [...new Set([...selectedWorkshopIds.value, workshopId])]
    : selectedWorkshopIds.value.filter(id => id !== workshopId)
}

async function saveAssignments() {
  if (!props.vehicle || !selectedWorkshopIds.value.length) return

  loading.value = true
  try {
    await $fetch(`/api/vehicles/${props.vehicle.id}/workshops`, {
      method: 'PATCH',
      body: { workshopIds: selectedWorkshopIds.value }
    })
    toast.add({
      title: 'Talleres actualizados',
      description: `${props.vehicle.licensePlate || `${props.vehicle.make} ${props.vehicle.model} ${props.vehicle.year}`} ya está disponible en los talleres seleccionados.`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
    emit('updated')
  } catch (error) {
    toast.add({
      title: 'No se pudieron actualizar los talleres',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Asignar vehículo a talleres"
    :description="vehicle ? `Define qué equipos pueden usar el vehículo ${vehicle.licensePlate || `${vehicle.make} ${vehicle.model} ${vehicle.year}`}. Su cliente también será visible en esos talleres.` : undefined"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-3">
        <UCheckbox
          v-for="workshop in workshops"
          :key="workshop.id"
          :model-value="selectedWorkshopIds.includes(workshop.id)"
          :label="workshop.name"
          :description="selectedWorkshopIds.includes(workshop.id) ? 'Este taller puede usar el vehículo.' : 'Este taller no puede ver el vehículo.'"
          @update:model-value="toggleWorkshop(workshop.id, Boolean($event))"
        />

        <UAlert
          v-if="!selectedWorkshopIds.length"
          title="Selecciona al menos un taller"
          description="Todo vehículo debe permanecer visible para al menos un equipo."
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Cancelar"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        label="Guardar asignaciones"
        :loading="loading"
        :disabled="!vehicle || !selectedWorkshopIds.length"
        @click="saveAssignments"
      />
    </template>
  </UModal>
</template>
