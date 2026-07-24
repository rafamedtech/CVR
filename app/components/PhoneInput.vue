<script setup lang="ts">
import { formatPhone, normalizePhone } from '~/utils/crm'

const model = defineModel<string>({ default: '' })
const displayValue = computed({
  get: () => formatPhone(model.value),
  set: (value: string) => {
    model.value = normalizePhone(value)
  }
})
</script>

<template>
  <UInput
    v-model="displayValue"
    inputmode="tel"
    autocomplete="tel"
    maxlength="14"
    placeholder="(664) 259-1920"
    class="w-full"
  />
</template>
