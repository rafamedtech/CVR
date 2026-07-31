<script setup lang="ts">
import type { CustomerListItem, WorkshopSummary } from '~/types/crm'

const props = defineProps<{
  customer: CustomerListItem | null
  workshops: readonly WorkshopSummary[]
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ updated: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const selectedWorkshopIds = shallowRef<string[]>([])

watch([open, () => props.customer], ([isOpen, customer]) => {
  if (!isOpen || !customer) return
  selectedWorkshopIds.value = customer.workshops.map(workshop => workshop.id)
}, { immediate: true })

function toggleWorkshop(workshopId: string, selected: boolean) {
  selectedWorkshopIds.value = selected
    ? [...new Set([...selectedWorkshopIds.value, workshopId])]
    : selectedWorkshopIds.value.filter(id => id !== workshopId)
}

async function saveAssignments() {
  if (!props.customer || !selectedWorkshopIds.value.length) return

  loading.value = true
  try {
    await $fetch(`/api/customers/${props.customer.id}/workshops`, {
      method: 'PATCH',
      body: { workshopIds: selectedWorkshopIds.value }
    })
    toast.add({
      title: 'Talleres actualizados',
      description: `${props.customer.fullName} ya está visible en los talleres seleccionados.`,
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
    title="Asignar cliente a talleres"
    :description="customer ? `Define qué equipos pueden ver a ${customer.fullName}.` : undefined"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-3">
        <UCheckbox
          v-for="workshop in workshops"
          :key="workshop.id"
          :model-value="selectedWorkshopIds.includes(workshop.id)"
          :label="workshop.name"
          :description="selectedWorkshopIds.includes(workshop.id) ? 'Este taller puede consultar al cliente.' : 'Este taller no puede ver al cliente.'"
          @update:model-value="toggleWorkshop(workshop.id, Boolean($event))"
        />

        <UAlert
          v-if="!selectedWorkshopIds.length"
          title="Selecciona al menos un taller"
          description="Todo cliente debe permanecer visible para al menos un equipo."
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
        :disabled="!customer || !selectedWorkshopIds.length"
        @click="saveAssignments"
      />
    </template>
  </UModal>
</template>
