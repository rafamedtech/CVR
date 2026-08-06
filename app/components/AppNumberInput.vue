<script setup lang="ts">
type NumberInputFormat = 'number' | 'currency'

const props = withDefaults(defineProps<{
  format?: NumberInputFormat
  currency?: string
  locale?: string
  min?: number
  max?: number
  step?: number
  stepSnapping?: boolean
  maximumFractionDigits?: number
  centered?: boolean
  decrementDisabled?: boolean
  incrementDisabled?: boolean
}>(), {
  format: 'number',
  currency: 'MXN',
  locale: 'es-MX',
  min: undefined,
  max: undefined,
  step: 1,
  stepSnapping: true,
  maximumFractionDigits: 2,
  centered: false,
  decrementDisabled: false,
  incrementDisabled: false
})
const value = defineModel<number>({ required: true })

const formatOptions = computed<Intl.NumberFormatOptions>(() => props.format === 'currency'
  ? {
      style: 'currency',
      currency: props.currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: props.maximumFractionDigits
    }
  : {
      maximumFractionDigits: props.maximumFractionDigits
    })
const inputUi = computed(() => props.centered ? { base: 'text-center' } : undefined)
</script>

<template>
  <UInputNumber
    v-model="value"
    :min="min"
    :max="max"
    :step="step"
    :step-snapping="stepSnapping"
    :format-options="formatOptions"
    :locale="locale"
    :decrement-disabled="decrementDisabled"
    :increment-disabled="incrementDisabled"
    :ui="inputUi"
    class="w-full"
  />
</template>
