<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

withDefaults(defineProps<{
  disabled?: boolean
  label?: string
}>(), { label: 'Nueva orden' })
const emit = defineEmits<{ create: [] }>()
const { session, isAllWorkshops, isSuperAdmin, selectWorkshop } = useCrmSession()
const icons = {
  BODY_SHOP: 'i-lucide-paintbrush',
  MECHANICAL: 'i-lucide-wrench',
  PAINT_STORE: 'i-lucide-palette'
}
const items = computed<DropdownMenuItem[]>(() => (session.value?.workshops ?? []).map(workshop => ({
  label: workshop.name,
  icon: icons[workshop.type],
  disabled: !isSuperAdmin.value && !['MANAGER', 'ADVISOR'].includes(workshop.role ?? ''),
  onSelect: () => selectWorkshop(workshop.id, '/ordenes?create=1')
})))
</script>

<template>
  <UDropdownMenu v-if="isAllWorkshops" :items="items" :content="{ align: 'end' }">
    <UButton
      :label="label"
      icon="i-lucide-file-plus-2"
      trailing-icon="i-lucide-chevron-down"
      :disabled="!items.some(item => !item.disabled)"
    />
  </UDropdownMenu>
  <UButton
    v-else
    :label="label"
    icon="i-lucide-file-plus-2"
    :disabled="disabled"
    @click="emit('create')"
  />
</template>
