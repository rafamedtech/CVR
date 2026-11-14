<script setup lang="ts">
import type { OrderListItem } from '~/types/crm'

const props = defineProps<{ order: Pick<OrderListItem, 'workshopId' | 'workshopName'> }>()
const { session } = useCrmSession()
const workshop = computed(() => session.value?.workshops.find(workshop => workshop.id === props.order.workshopId))
const indicators = {
  BODY_SHOP: { icon: 'i-lucide-paintbrush', label: 'Carrocería' },
  MECHANICAL: { icon: 'i-lucide-wrench', label: 'Mecánico' },
  PAINT_STORE: { icon: 'i-lucide-palette', label: 'Pinturas' }
}
const indicator = computed(() => workshop.value ? indicators[workshop.value.type] : null)
</script>

<template>
  <UTooltip :text="order.workshopName">
    <UBadge
      :label="indicator?.label ?? order.workshopName"
      :icon="indicator?.icon ?? 'i-lucide-building-2'"
      color="neutral"
      variant="subtle"
    />
  </UTooltip>
</template>
