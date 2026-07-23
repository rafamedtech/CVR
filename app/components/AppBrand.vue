<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <NuxtLink
    to="/"
    aria-label="Ir al resumen de Control de Talleres"
    class="flex w-full items-center justify-center rounded-lg bg-white p-1.5 ring ring-default/70 transition hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :class="collapsed ? 'h-9 px-1' : 'h-14'"
  >
    <img
      src="/brand/cvr-transport-logo.png"
      alt="CVR Transport Inc · Fletes y transporte"
      class="block max-h-full w-full object-contain"
      :class="collapsed ? 'max-w-9' : 'max-w-40'"
    >
  </NuxtLink>
</template>
