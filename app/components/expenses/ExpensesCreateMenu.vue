<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

withDefaults(defineProps<{
  items: DropdownMenuItem[]
  disabled?: boolean
  label?: string
}>(), { label: 'Registrar gasto' })
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      :label="label"
      icon="i-lucide-receipt-text"
      trailing-icon="i-lucide-chevron-down"
      :disabled="disabled"
    />
  </UDropdownMenu>
</template>
