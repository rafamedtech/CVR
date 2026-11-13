<script setup lang="ts">
import type { ExpenseListItem, WorkshopType } from '~/types/crm'

defineProps<{
  expense: Pick<ExpenseListItem, 'workshopType' | 'workshopName'>
}>()

const indicators: Record<WorkshopType, { icon: string, label: string }> = {
  BODY_SHOP: { icon: 'i-lucide-paintbrush', label: 'Carrocería' },
  MECHANICAL: { icon: 'i-lucide-wrench', label: 'Mecánico' },
  PAINT_STORE: { icon: 'i-lucide-palette', label: 'Pinturas' }
}
</script>

<template>
  <UTooltip :text="expense.workshopName">
    <UBadge
      :label="expense.workshopType ? indicators[expense.workshopType].label : 'Global'"
      :icon="expense.workshopType ? indicators[expense.workshopType].icon : 'i-lucide-globe'"
      :color="expense.workshopType ? 'neutral' : 'info'"
      variant="subtle"
    />
  </UTooltip>
</template>
