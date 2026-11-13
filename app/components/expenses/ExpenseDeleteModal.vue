<script setup lang="ts">
import type { ExpenseListItem } from '~/types/crm'

const props = defineProps<{
  expense: ExpenseListItem | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ deleted: [] }>()
const toast = useToast()
const deleting = shallowRef(false)

async function removeExpense() {
  if (!props.expense || deleting.value) return

  deleting.value = true
  try {
    await $fetch(`/api/expenses/${props.expense.id}`, { method: 'DELETE' })
    toast.add({ title: 'Gasto eliminado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('deleted')
  } catch (error) {
    toast.add({
      title: 'No se pudo eliminar el gasto',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Eliminar gasto"
    :description="`¿Deseas eliminar el gasto «${expense?.description}»? Esta acción no se puede deshacer.`"
    :close="false"
    :dismissible="false"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <UButton
        label="Cancelar"
        color="neutral"
        variant="outline"
        :disabled="deleting"
        @click="open = false"
      />
      <UButton
        label="Sí, eliminar gasto"
        icon="i-lucide-trash-2"
        color="error"
        :loading="deleting"
        @click="removeExpense"
      />
    </template>
  </UModal>
</template>
