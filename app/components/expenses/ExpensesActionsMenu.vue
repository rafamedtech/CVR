<script setup lang="ts">
import type { ExpenseListItem } from '~/types/crm'

defineProps<{
  expense: ExpenseListItem
  disabled?: boolean
}>()
const emit = defineEmits<{
  edit: []
  duplicate: []
  delete: []
}>()
</script>

<template>
  <UDropdownMenu
    :items="[{
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => emit('edit')
    }, {
      label: 'Duplicar',
      icon: 'i-lucide-copy',
      onSelect: () => emit('duplicate')
    }, {
      label: 'Eliminar',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => emit('delete')
    }]"
    :content="{ align: 'end' }"
  >
    <UButton
      icon="i-lucide-ellipsis-vertical"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="`Opciones del gasto: ${expense.description}`"
      :disabled="disabled"
    />
  </UDropdownMenu>
</template>
