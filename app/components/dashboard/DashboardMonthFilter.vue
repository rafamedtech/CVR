<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { DEFAULT_WORKSHOP_TIME_ZONE } from '~/utils/datetime'

const props = defineProps<{
  maxValue: DateValue
  hasSelection: boolean
  block?: boolean
  annual?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const selectedMonth = defineModel<DateValue>({ required: true })
const { workshopTimeZone } = useCrmSession()
const timeZone = computed(() => workshopTimeZone() ?? DEFAULT_WORKSHOP_TIME_ZONE)

function formatPeriod(selected: DateValue) {
  if (props.annual) return String(selected.year)

  const key = selected.toString().slice(0, 10)
  if (props.compact) return `${formatMonth(key).slice(0, 3).toUpperCase()} ${selected.year}`

  return formatReportMonth(key)
}
</script>

<template>
  <CalendarMonthPicker
    v-model="selectedMonth"
    :type="annual ? 'year' : 'month'"
    :time-zone="timeZone"
    :format-value="formatPeriod"
    :show-selection="hasSelection"
    :max-value="maxValue"
    placeholder="Resumen del mes actual"
    trailing-icon="i-lucide-chevron-down"
    :block="block"
    @select="emit('select')"
  />
</template>
