<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WorkshopType } from '~/types/crm'

const { session, selectWorkshop } = useCrmSession()

const workshopIcons: Record<WorkshopType, string> = {
  BODY_SHOP: 'i-lucide-paintbrush',
  MECHANICAL: 'i-lucide-wrench',
  PAINT_STORE: 'i-lucide-palette'
}

const current = computed(() => session.value?.selectedWorkshop ?? {
  name: 'Todos los talleres',
  icon: 'i-lucide-building-2'
})

const items = computed<DropdownMenuItem[][]>(() => {
  const workshopItems = (session.value?.workshops ?? []).map(workshop => ({
    label: workshop.name,
    icon: workshopIcons[workshop.type],
    checked: session.value?.selectedWorkshopId === workshop.id,
    type: 'checkbox' as const,
    onSelect: (event: Event) => {
      event.preventDefault()
      selectWorkshop(workshop.id)
    }
  }))

  const allItems = session.value?.canViewAll
    ? [{
        label: 'Todos los talleres',
        icon: 'i-lucide-building-2',
        checked: session.value.selectedWorkshopId === null,
        type: 'checkbox' as const,
        onSelect: (event: Event) => {
          event.preventDefault()
          selectWorkshop(null)
        }
      }]
    : []

  return [allItems, workshopItems].filter(group => group.length)
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end', collisionPadding: 12 }"
    :ui="{ content: 'w-64' }"
  >
    <UButton
      :label="current.name"
      :icon="'icon' in current ? current.icon : workshopIcons[current.type]"
      trailing-icon="i-lucide-chevrons-up-down"
      color="neutral"
      variant="outline"
      class="max-w-56 bg-default data-[state=open]:bg-elevated"
      :ui="{
        label: 'hidden max-w-40 truncate xl:block',
        trailingIcon: 'hidden xl:block'
      }"
    />
  </UDropdownMenu>
</template>
