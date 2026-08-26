<script setup lang="ts">
import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import { convertToMxn } from '#shared/currency'
import { expenseMutationSchema, type ExpenseAssignmentType, type ExpenseMutation } from '#shared/expense'
import type { Currency, ExpenseListItem, ExpenseOrderOption } from '~/types/crm'
import { currencyOptions } from '~/utils/crm'

const props = defineProps<{
  expense?: ExpenseListItem | null
  orders?: ExpenseOrderOption[]
  fixedOrder?: ExpenseOrderOption | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  created: []
  updated: []
}>()
const toast = useToast()
const loading = shallowRef(false)
const expenseDate = shallowRef<CalendarDate | undefined>(today(getLocalTimeZone()))
const expenseDateOpen = shallowRef(false)
const categoryOptions = Object.entries(expenseCategoryLabels).map(([value, label]) => ({ value, label }))
const methodOptions = Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))
const assignmentOptions: Array<{ label: string, value: ExpenseAssignmentType }> = [{
  label: 'Taller',
  value: 'WORKSHOP'
}, {
  label: 'Orden de trabajo',
  value: 'ORDER'
}]
const orderOptions = computed(() => (props.orders ?? []).map(order => ({
  label: `Orden ${order.orderNumber} · ${order.customerName}`,
  description: order.vehicleLabel,
  value: order.id
})))
const isEditing = computed(() => Boolean(props.expense))
const modalTitle = computed(() => isEditing.value ? 'Editar gasto' : 'Registrar gasto')
const modalDescription = computed(() => isEditing.value
  ? 'Actualiza la información del gasto registrado.'
  : 'Los gastos se descuentan para calcular la utilidad neta.')
const submitLabel = computed(() => isEditing.value ? 'Guardar cambios' : 'Guardar gasto')
function emptyExpenseState(): ExpenseMutation {
  const currentDate = today(getLocalTimeZone())

  return {
    category: 'OTHER',
    method: 'CASH',
    description: '',
    vendor: '',
    amount: 0,
    currency: 'MXN',
    exchangeRate: 1,
    expenseDate: currentDate.toString(),
    assignmentType: props.fixedOrder ? 'ORDER' : 'WORKSHOP',
    orderId: props.fixedOrder?.id ?? '',
    notes: ''
  }
}

const state = reactive<ExpenseMutation>({
  ...emptyExpenseState()
})
const expenseEquivalentMxn = computed(() => convertToMxn(state.amount, state.currency, state.exchangeRate))

function formatExpenseDate(date: CalendarDate | undefined) {
  if (!date) return 'Selecciona una fecha'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium'
  }).format(date.toDate(getLocalTimeZone()))
}

watch(expenseDate, (date) => {
  state.expenseDate = date?.toString() ?? ''
})

watch(() => state.assignmentType, (assignmentType) => {
  if (assignmentType === 'WORKSHOP') state.orderId = ''
})

watch(() => state.currency, (currency: Currency) => {
  if (currency === 'MXN') state.exchangeRate = 1
})

watch([open, () => props.expense], ([isOpen, expense]) => {
  if (!isOpen) return

  const nextState = expense
    ? {
        category: expense.category,
        method: expense.method,
        description: expense.description,
        vendor: expense.vendor ?? '',
        amount: expense.amount,
        currency: expense.currency ?? 'MXN',
        exchangeRate: expense.exchangeRate ?? 1,
        expenseDate: expense.expenseDate.slice(0, 10),
        assignmentType: expense.order ? 'ORDER' as const : 'WORKSHOP' as const,
        orderId: expense.order?.id ?? '',
        notes: expense.notes ?? ''
      }
    : emptyExpenseState()

  Object.assign(state, nextState)
  expenseDate.value = parseDate(nextState.expenseDate)
  expenseDateOpen.value = false
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<ExpenseMutation>) {
  loading.value = true
  try {
    if (props.expense) {
      await $fetch(`/api/expenses/${props.expense.id}`, {
        method: 'PATCH',
        body: event.data
      })
    } else {
      await $fetch('/api/expenses', { method: 'POST', body: event.data })
    }

    toast.add({
      title: props.expense ? 'Gasto actualizado' : 'Gasto registrado',
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
    if (props.expense) {
      emit('updated')
    } else {
      emit('created')
    }
  } catch (error) {
    toast.add({
      title: props.expense ? 'No se pudo actualizar el gasto' : 'No se pudo registrar el gasto',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
    :close="false"
    :dismissible="false"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="expense-form"
        :schema="expenseMutationSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField name="category" label="Categoría" required>
            <USelect
              v-model="state.category"
              :items="categoryOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField name="expenseDate" label="Fecha" required>
            <UPopover v-model:open="expenseDateOpen">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar-days"
                :label="formatExpenseDate(expenseDate)"
                class="w-full justify-start font-normal"
              />

              <template #content>
                <UCalendar
                  v-model="expenseDate"
                  locale="es-MX"
                  @update:model-value="expenseDateOpen = false"
                />
              </template>
            </UPopover>
          </UFormField>
        </div>
        <UFormField v-if="fixedOrder" label="Aplicar gasto a">
          <div class="flex items-start gap-3 rounded-lg border border-default bg-elevated p-3">
            <UIcon name="i-lucide-clipboard-list" class="mt-0.5 size-5 shrink-0 text-primary" />
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                Orden {{ fixedOrder.orderNumber }} · {{ fixedOrder.customerName }}
              </p>
              <p class="truncate text-sm text-muted">
                {{ fixedOrder.vehicleLabel }}
              </p>
            </div>
          </div>
        </UFormField>
        <UFormField
          v-else
          name="assignmentType"
          label="Aplicar gasto a"
          required
        >
          <URadioGroup
            v-model="state.assignmentType"
            :items="assignmentOptions"
            value-key="value"
            variant="card"
            :ui="{ fieldset: 'grid grid-cols-1 gap-3 sm:grid-cols-2' }"
          />
        </UFormField>
        <UFormField
          v-if="!fixedOrder && state.assignmentType === 'ORDER'"
          name="orderId"
          label="Orden de trabajo"
          required
        >
          <USelectMenu
            v-model="state.orderId"
            :items="orderOptions"
            value-key="value"
            searchable
            placeholder="Buscar por orden, cliente o vehículo…"
            class="min-w-0 w-full"
            :ui="{ value: 'min-w-0 truncate', itemLabel: 'min-w-0 truncate' }"
          />
        </UFormField>
        <UFormField name="description" label="Descripción" required>
          <UInput v-model="state.description" class="w-full" />
        </UFormField>
        <UFormField name="vendor" label="Proveedor">
          <UInput v-model="state.vendor" class="w-full" />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField name="currency" label="Tipo de moneda" required>
            <USelect
              v-model="state.currency"
              :items="currencyOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField name="exchangeRate" label="Tipo de cambio" required>
            <AppNumberInput
              v-model="state.exchangeRate"
              :disabled="state.currency === 'MXN'"
              :min="0.000001"
              :step="0.01"
              :step-snapping="false"
              :maximum-fraction-digits="6"
            />
          </UFormField>
          <UFormField name="amount" label="Importe" required>
            <AppNumberInput
              v-model="state.amount"
              format="currency"
              :currency="state.currency"
              :min="0.01"
              :step="0.01"
              :step-snapping="false"
            />
          </UFormField>
          <UFormField name="method" label="Método de pago" required>
            <USelect
              v-model="state.method"
              :items="methodOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>
        <UAlert
          v-if="state.currency === 'USD'"
          :title="`Equivalente aplicado: ${formatCurrency(expenseEquivalentMxn)} MXN`"
          icon="i-lucide-arrow-left-right"
          color="neutral"
          variant="subtle"
        />
        <UFormField name="notes" label="Notas">
          <UTextarea
            v-model="state.notes"
            class="w-full"
            :rows="3"
            autoresize
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close }">
      <UButton
        label="Cancelar"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        type="submit"
        form="expense-form"
        :label="submitLabel"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
