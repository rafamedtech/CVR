<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
  options: Array<{ label: string, value: string, icon: string }>
}>()
const business = defineModel<string>({ required: true })
const emit = defineEmits<{ change: [] }>()

const selectedIcon = computed(() => props.options.find(option => option.value === business.value)?.icon)
const tabs = computed<NavigationMenuItem[]>(() => props.options.map(option => ({
  label: option.label,
  icon: option.icon,
  active: business.value === option.value,
  onSelect: () => {
    if (business.value === option.value) return
    business.value = option.value
    emit('change')
  }
})))
</script>

<template>
  <UNavigationMenu
    :items="tabs"
    highlight
    aria-label="Negocio del reporte"
    class="-mx-1 hidden min-w-0 flex-1 lg:flex"
  />
  <USelect
    v-model="business"
    :items="options"
    :icon="selectedIcon"
    aria-label="Negocio del reporte"
    class="w-full lg:hidden"
    @update:model-value="emit('change')"
  />
</template>
