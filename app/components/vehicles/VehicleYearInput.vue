<script setup lang="ts">
const year = defineModel<number>({ required: true })
const maximumYear = new Date().getFullYear() + 1
</script>

<template>
  <AppNumberInput
    v-model="year"
    :min="1900"
    :max="maximumYear"
    :step="1"
    :maximum-fraction-digits="0"
  />
</template>
