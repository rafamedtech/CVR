<script setup lang="ts">
import { getLocalTimeZone, type DateValue } from '@internationalized/date'
import { formatCalendarRange } from '#shared/date'
import type { OrderStatus } from '~/types/crm'

const search = defineModel<string>('search', { default: '' })
const statuses = defineModel<OrderStatus[]>('statuses', { default: () => [] })
const dateRange = defineModel<{
  start: DateValue | undefined
  end: DateValue | undefined
} | null>('dateRange', { default: null })
defineProps<{ hasActiveFilters: boolean }>()
const emit = defineEmits<{ clear: [] }>()
const timeZone = getLocalTimeZone()

type StatusOptionValue = OrderStatus | 'ALL'

const orderStatuses = Object.keys(orderStatusLabels) as OrderStatus[]
const statusOptions: Array<{ label: string, value: StatusOptionValue }> = [
  { label: 'Todos los estados', value: 'ALL' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value: value as OrderStatus, label }))
]
function updateStatuses(selection: StatusOptionValue[], draft: OrderStatus[]) {
  if (selection.includes('ALL') && draft.length) return []
  const selected = selection.filter((value): value is OrderStatus => value !== 'ALL')
  return selected.length === orderStatuses.length ? [] : selected
}

function statusLabel(selection: OrderStatus[]) {
  if (!selection.length) return 'Todos los estados'
  if (selection.length === 1) return orderStatusLabels[selection[0]!]
  return `${selection.length} seleccionados`
}

function formatOrderRange(start: DateValue, end: DateValue) {
  return formatCalendarRange(start.toString(), end.toString())
}
</script>

<template>
  <UDashboardToolbar :ui="{ root: 'py-3', left: 'w-full min-w-0' }">
    <ListToolbar
      v-model:search="search"
      placeholder="Buscar orden, cliente, placas o vehículo…"
      :has-active-filters="hasActiveFilters"
      clear-label="Limpiar filtros"
      class="w-full"
      @clear="emit('clear')"
    >
      <template #filters>
        <div class="flex min-w-0 gap-2 sm:contents">
          <CalendarRangePicker
            v-model="dateRange"
            :time-zone="timeZone"
            :format-range="formatOrderRange"
            placeholder="Fecha de orden"
            icon="i-lucide-calendar-days"
            class="min-w-0 flex-1 justify-start font-normal sm:flex-none"
            :ui="{ label: 'truncate' }"
          />
          <ListFiltersDialog :values="statuses" :defaults="[]" @apply="statuses = $event">
            <AppButton
              label="Más filtros"
              icon="i-lucide-sliders-horizontal"
              intent="secondary"
              class="shrink-0"
            />
            <template #fields="{ draft, update }">
              <UFormField label="Estados">
                <USelectMenu
                  :model-value="draft.length ? draft : ['ALL']"
                  :items="statusOptions"
                  value-key="value"
                  multiple
                  :search-input="false"
                  aria-label="Filtrar por estados"
                  :ui="{ content: 'max-h-(--reka-combobox-content-available-height)' }"
                  class="w-full"
                  @update:model-value="update(updateStatuses($event, draft))"
                >
                  <template #default>
                    <span class="min-w-0 truncate">{{ statusLabel(draft) }}</span>
                  </template>
                </USelectMenu>
              </UFormField>
            </template>
          </ListFiltersDialog>
        </div>
        <slot name="customer-filter" />
      </template>
      <template #actions>
        <div class="hidden md:block">
          <slot name="right" />
        </div>
      </template>
    </ListToolbar>
  </UDashboardToolbar>
</template>
