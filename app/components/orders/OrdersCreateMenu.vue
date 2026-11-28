<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

withDefaults(defineProps<{
  disabled?: boolean
  label?: string
}>(), { label: 'Nueva orden' })
const emit = defineEmits<{ create: [] }>()
const { session, isAllWorkshops, isSuperAdmin, selectWorkshop } = useCrmSession()
const items = computed<DropdownMenuItem[]>(() => (session.value?.workshops ?? []).filter(workshop => workshop.type !== 'TRANSPORT').map(workshop => ({
  label: workshop.name,
  icon: workshopTypeIcons[workshop.type],
  disabled: !isSuperAdmin.value && !['MANAGER', 'ADVISOR'].includes(workshop.role ?? ''),
  onSelect: () => selectWorkshop(workshop.id, '/ordenes?create=1')
})))
</script>

<template>
  <ListCreateButton
    :action="{
      label,
      icon: 'i-lucide-file-plus-2',
      items: isAllWorkshops ? items : undefined,
      disabled: isAllWorkshops ? !items.some(item => !item.disabled) : disabled
    }"
    compact
    @create="emit('create')"
  />
</template>
