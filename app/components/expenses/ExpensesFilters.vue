<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { formatCalendarRange } from '#shared/date'
import { DEFAULT_WORKSHOP_TIME_ZONE } from '~/utils/datetime'
import type { ExpenseCategory } from '~/types/crm'

const search = defineModel<string>('search', { default: '' })
const categories = defineModel<ExpenseCategory[]>('categories', { default: () => [] })
const dateRange = defineModel<{
  start: DateValue | undefined
  end: DateValue | undefined
} | null>('dateRange', { default: null })
const { workshopTimeZone } = useCrmSession()
const timeZone = computed(() => workshopTimeZone() ?? DEFAULT_WORKSHOP_TIME_ZONE)

type CategoryOption = ExpenseCategory | 'ALL'
const allCategories = Object.keys(expenseCategoryLabels) as ExpenseCategory[]
const categoryOptions = [
  { label: 'Todas las categorías', value: 'ALL' },
  ...allCategories.map(value => ({ value, label: expenseCategoryLabels[value] }))
]
const categorySelection = computed<CategoryOption[]>({
  get: (): CategoryOption[] => categories.value.length ? categories.value : ['ALL'],
  set: (selection: CategoryOption[]) => {
    if (selection.includes('ALL') && categories.value.length) {
      categories.value = []
      return
    }
    const selected = selection.filter((value): value is ExpenseCategory => value !== 'ALL')
    categories.value = selected.length === allCategories.length ? [] : selected
  }
})
const categoryFilterLabel = computed(() => {
  if (!categories.value.length) return 'Todas las categorías'
  if (categories.value.length === 1) return expenseCategoryLabels[categories.value[0]!]
  return `${categories.value.length} seleccionadas`
})
function formatExpenseRange(start: DateValue, end: DateValue) {
  return formatCalendarRange(start.toString(), end.toString())
}
</script>

<template>
  <UDashboardToolbar :ui="{ root: 'py-3', left: 'min-w-0 w-full flex-col items-start gap-2 md:w-auto md:flex-1 lg:flex-row lg:flex-wrap lg:items-center', right: 'hidden shrink-0 md:flex' }">
    <template #left>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar descripción, proveedor o categoría…"
        class="w-full sm:w-96"
      />
      <div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <USelectMenu
          v-model="categorySelection"
          :items="categoryOptions"
          value-key="value"
          multiple
          :search-input="false"
          aria-label="Filtrar por categorías"
          class="min-w-0 w-full sm:w-56"
          :ui="{ content: 'max-h-(--reka-combobox-content-available-height)' }"
        >
          <template #default>
            <span class="min-w-0 truncate">{{ categoryFilterLabel }}</span>
          </template>
        </USelectMenu>
        <CalendarRangePicker
          v-model="dateRange"
          :time-zone="timeZone"
          :format-range="formatExpenseRange"
          placeholder="Fecha de gasto"
          icon="i-lucide-calendar-days"
          class="w-full min-w-0 justify-start font-normal sm:w-auto"
          :ui="{ label: 'truncate' }"
        />
      </div>
    </template>
    <template #right>
      <slot name="right" />
    </template>
  </UDashboardToolbar>
</template>
