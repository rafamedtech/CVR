<script setup lang="ts">
import { getLocalTimeZone, type DateValue } from '@internationalized/date'
import type { OrderStatus } from '~/types/crm'

const search = defineModel<string>('search', { default: '' })
const statuses = defineModel<OrderStatus[]>('statuses', { default: () => [] })
const dateRange = defineModel<{
  start: DateValue | undefined
  end: DateValue | undefined
} | null>('dateRange', { default: null })
const dateFilterOpen = shallowRef(false)

type StatusOptionValue = OrderStatus | 'ALL'

const orderStatuses = Object.keys(orderStatusLabels) as OrderStatus[]
const statusOptions: Array<{ label: string, value: StatusOptionValue }> = [
  { label: 'Todos los estados', value: 'ALL' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value: value as OrderStatus, label }))
]
const statusSelection = computed<StatusOptionValue[]>({
  get: (): StatusOptionValue[] => !statuses.value.length ? ['ALL'] : statuses.value,
  set: (selection: StatusOptionValue[]) => {
    const wasAllSelected = !statuses.value.length
    const selectedStatuses = selection.filter((value): value is OrderStatus => value !== 'ALL')

    if (selection.includes('ALL') && !wasAllSelected) {
      statuses.value = []
      return
    }

    statuses.value = !selectedStatuses.length || selectedStatuses.length === orderStatuses.length
      ? []
      : selectedStatuses
  }
})
const statusFilterLabel = computed(() => {
  if (!statuses.value.length) return 'Todos los estados'
  if (statuses.value.length === 1) return orderStatusLabels[statuses.value[0]!]!
  return `${statuses.value.length} seleccionados`
})
const dateFilterLabel = computed(() => {
  const { start, end } = dateRange.value ?? {}
  if (start && end) return `${formatCalendarDate(start)} – ${formatCalendarDate(end)}`
  if (start) return `Elige fecha final · ${formatCalendarDate(start)}`
  return 'Fecha de orden'
})

function formatCalendarDate(date: DateValue) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium'
  }).format(date.toDate(getLocalTimeZone()))
}

function handleDateRangeUpdate(value: { start: DateValue | undefined, end: DateValue | undefined } | null) {
  if (value?.start && value.end) dateFilterOpen.value = false
}

function clearDateFilter() {
  dateRange.value = null
  dateFilterOpen.value = false
}
</script>

<template>
  <UDashboardToolbar :ui="{ root: 'py-3', left: 'min-w-0 w-full flex-col items-start gap-2 md:w-auto md:flex-1 lg:flex-row lg:flex-wrap lg:items-center', right: 'hidden shrink-0 md:flex' }">
    <template #left>
      <div class="flex w-full flex-wrap items-center gap-2 lg:w-auto">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Buscar orden, cliente, placas o vehículo…"
          class="w-full sm:w-96"
        />
        <slot name="customer-filter" />
      </div>
      <div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <USelectMenu
          v-model="statusSelection"
          :items="statusOptions"
          value-key="value"
          multiple
          :search-input="false"
          aria-label="Filtrar por estados"
          :ui="{ content: 'max-h-(--reka-combobox-content-available-height)' }"
          class="min-w-0 w-full sm:w-56"
        >
          <template #default>
            <span class="min-w-0 truncate">{{ statusFilterLabel }}</span>
          </template>
        </USelectMenu>
        <UPopover v-model:open="dateFilterOpen" class="min-w-0 w-full sm:w-auto">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-calendar-days"
            :label="dateFilterLabel"
            class="w-full justify-start font-normal sm:w-auto"
            :ui="{ label: 'truncate' }"
          />

          <template #content>
            <div class="p-2">
              <UCalendar
                v-model="dateRange"
                range
                locale="es-MX"
                @update:model-value="handleDateRangeUpdate"
              />
              <div class="flex justify-end border-t border-muted pt-2">
                <UButton
                  label="Limpiar fechas"
                  color="neutral"
                  variant="ghost"
                  :disabled="!dateRange"
                  @click="clearDateFilter"
                />
              </div>
            </div>
          </template>
        </UPopover>
      </div>
    </template>
    <template #right>
      <slot name="right" />
    </template>
  </UDashboardToolbar>
</template>
