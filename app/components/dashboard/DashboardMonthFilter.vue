<script setup lang="ts">
import type { DateValue } from '@internationalized/date'

const props = defineProps<{
  maxValue: DateValue
  hasSelection: boolean
  block?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const selectedMonth = defineModel<DateValue>({ required: true })
const open = shallowRef(false)

const buttonLabel = computed(() => {
  if (!props.hasSelection) return 'Resumen del mes actual'

  const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long' })
    .format(selectedMonth.value.toDate('UTC'))

  return `Resumen del mes de ${monthName}`
})

function isDateValue(value: unknown): value is DateValue {
  return typeof value === 'object'
    && value !== null
    && 'year' in value
    && 'month' in value
    && 'toDate' in value
}

function selectMonth(month: unknown) {
  if (!isDateValue(month)) return

  selectedMonth.value = month
  open.value = false
  emit('select')
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-calendar-days"
      trailing-icon="i-lucide-chevron-down"
      :label="buttonLabel"
      :block="props.block"
    />

    <template #content>
      <UCalendar
        type="month"
        locale="es-MX"
        prevent-deselect
        :model-value="props.hasSelection ? selectedMonth : undefined"
        :placeholder="selectedMonth"
        :max-value="props.maxValue"
        @update:model-value="selectMonth"
      />
    </template>
  </UPopover>
</template>
