<script setup lang="ts">
import { getLocalTimeZone, type DateValue } from '@internationalized/date'
import type { ExpenseCategory } from '~/types/crm'

const search = defineModel<string>('search', { default: '' })
const categories = defineModel<ExpenseCategory[]>('categories', { default: () => [] })
const dateRange = defineModel<{
  start: DateValue | undefined
  end: DateValue | undefined
} | null>('dateRange', { default: null })
const dateFilterOpen = shallowRef(false)

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
const dateFilterLabel = computed(() => {
  const { start, end } = dateRange.value ?? {}
  if (start && end) return `${formatCalendarDate(start)} – ${formatCalendarDate(end)}`
  if (start) return `Elige fecha final · ${formatCalendarDate(start)}`
  return 'Fecha de gasto'
})

function formatCalendarDate(date: DateValue) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date.toDate(getLocalTimeZone()))
}

function handleDateRangeUpdate(value: typeof dateRange.value) {
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
