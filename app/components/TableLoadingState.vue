<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Cargando datos…' })
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-12 text-muted" role="status" aria-live="polite">
    <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin motion-reduce:animate-none" />
    <span class="text-sm">{{ label }}</span>
  </div>
</template>
