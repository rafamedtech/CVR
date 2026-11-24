<script setup lang="ts">
import type { ExpenseListItem } from '~/types/crm'

const props = defineProps<{
  expense: ExpenseListItem | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ deleted: [] }>()
const toast = useToast()
const deleting = shallowRef(false)
const errorMessage = ref('')

watch(open, (value) => {
  if (value) errorMessage.value = ''
})

async function removeExpense() {
  if (!props.expense || deleting.value) return

  deleting.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/expenses/${props.expense.id}`, { method: 'DELETE' })
    toast.add({ title: 'Gasto eliminado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('deleted')
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <DestructiveConfirmModal
    v-model:open="open"
    title="Eliminar gasto"
    :description="`¿Deseas eliminar el gasto «${expense?.description}»? Esta acción no se puede deshacer.`"
    :close="false"
    :dismissible="false"
    confirm-label="Sí, eliminar gasto"
    confirm-icon="i-lucide-trash-2"
    :confirm-disabled="!expense"
    :loading="deleting"
    :error="errorMessage"
    @confirm="removeExpense"
  />
</template>
