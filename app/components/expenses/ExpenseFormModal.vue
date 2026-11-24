<script setup lang="ts">
import { formatDateOnly } from '#shared/date'
import { parseDate, today, type DateValue } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import { expenseMutationSchema, type ExpenseAssignmentType, type ExpenseMutation } from '#shared/expense'
import type { Currency, ExpenseListItem, ExpenseOrderOption } from '~/types/crm'
import { DEFAULT_WORKSHOP_TIME_ZONE } from '~/utils/datetime'
import { currencyOptions } from '~/utils/crm'

const props = defineProps<{
  initialScope?: 'GLOBAL' | 'WORKSHOP'
  expense?: ExpenseListItem | null
  duplicateExpense?: ExpenseListItem | null
  orders?: ExpenseOrderOption[]
  fixedOrder?: ExpenseOrderOption | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  created: []
  updated: []
  deleted: []
}>()
const toast = useToast()
const { isSuperAdmin, activeWorkshop, canRecordExpenses, workshopTimeZone } = useCrmSession()
const scopeOptions = computed(() => [{
  label: 'Global · Todos los negocios', value: 'GLOBAL', disabled: !isSuperAdmin.value
}, {
  label: `Taller · ${activeWorkshop.value?.name ?? 'Selecciona un taller'}`,
  value: 'WORKSHOP', disabled: !canRecordExpenses.value
}])
const loading = shallowRef(false)
const deleting = shallowRef(false)
const deleteConfirmationOpen = shallowRef(false)
const timeZone = computed(() => workshopTimeZone(activeWorkshop.value?.id) ?? DEFAULT_WORKSHOP_TIME_ZONE)
const expenseDate = shallowRef<DateValue | undefined>(today(timeZone.value))
const deleteError = shallowRef('')
const deleteButton = useTemplateRef<{ $el: HTMLElement }>('deleteButton')
const expenseForm = useTemplateRef('expenseForm')
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
const modalTitle = computed(() => isEditing.value
  ? 'Editar gasto'
  : props.duplicateExpense ? 'Duplicar gasto' : 'Registrar gasto')
const modalDescription = computed(() => isEditing.value
  ? 'Actualiza la información del gasto registrado.'
  : props.duplicateExpense
    ? 'Revisa los datos y guarda una copia como un nuevo gasto.'
    : 'Los gastos se descuentan para calcular la utilidad neta.')
const submitLabel = computed(() => isEditing.value ? 'Guardar cambios' : 'Guardar gasto')
function emptyExpenseState(): ExpenseMutation {
  const currentDate = today(timeZone.value)

  return {
    category: 'OTHER',
    method: 'CASH',
    description: '',
    vendor: '',
    amount: 0,
    currency: 'MXN',
    exchangeRate: 1,
    expenseDate: currentDate.toString(),
    assignmentType: props.fixedOrder ? 'ORDER' : props.initialScope ?? 'WORKSHOP',
    orderId: props.fixedOrder?.id ?? '',
    notes: ''
  }
}

const state = reactive<Omit<ExpenseMutation, 'amount' | 'exchangeRate'> & { amount?: number, exchangeRate?: number }>({
  ...emptyExpenseState()
})
const expenseScope = computed({
  get: () => state.assignmentType === 'GLOBAL' ? 'GLOBAL' : 'WORKSHOP',
  set: (value: string) => {
    state.assignmentType = value === 'GLOBAL' ? 'GLOBAL' : 'WORKSHOP'
    state.orderId = ''
  }
})

function formatExpenseDate(date: DateValue | undefined) {
  if (!date) return 'Selecciona una fecha'

  return formatDateOnly(date.toString())
}

watch(expenseDate, (date) => {
  state.expenseDate = date?.toString() ?? ''
})

watch(() => state.assignmentType, (assignmentType) => {
  if (assignmentType !== 'ORDER') {
    state.orderId = ''
    expenseForm.value?.clear('orderId')
  }
})

watch(() => state.currency, (currency: Currency) => {
  if (currency === 'MXN') state.exchangeRate = 1
})

watch([open, () => props.expense, () => props.duplicateExpense], ([isOpen, editingExpense, duplicateExpense]) => {
  if (!isOpen) return

  deleteConfirmationOpen.value = false

  const expense = editingExpense ?? duplicateExpense
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
        assignmentType: expense.workshopId === null ? 'GLOBAL' as const : expense.order ? 'ORDER' as const : 'WORKSHOP' as const,
        orderId: expense.order?.id ?? '',
        notes: expense.notes ?? ''
      }
    : emptyExpenseState()

  Object.assign(state, nextState)
  expenseDate.value = parseDate(nextState.expenseDate)
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<ExpenseMutation>) {
  if (loading.value || deleting.value || deleteConfirmationOpen.value) return

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

function openDeleteConfirmation() {
  deleteError.value = ''
  deleteConfirmationOpen.value = true
}

function restoreDeleteFocus() {
  if (open.value && !deleteConfirmationOpen.value) deleteButton.value?.$el.focus()
}

async function removeExpense() {
  if (!props.expense || loading.value || deleting.value) return

  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/expenses/${props.expense.id}`, { method: 'DELETE' })
    toast.add({ title: 'Gasto eliminado', color: 'success', icon: 'i-lucide-check' })
    deleteConfirmationOpen.value = false
    open.value = false
    emit('deleted')
  } catch (error) {
    deleteError.value = getApiErrorMessage(error) || 'No se pudo eliminar el gasto.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
    :close="{ disabled: loading || deleting || deleteConfirmationOpen }"
    :dismissible="false"
    :ui="{
      content: 'max-w-4xl',
      header: 'pr-12 sm:pr-14',
      title: 'text-lg font-semibold text-primary',
      body: 'p-4 sm:p-6',
      footer: 'flex-wrap gap-2 justify-end bg-elevated/30'
    }"
  >
    <template #body>
      <UForm
        id="expense-form"
        ref="expenseForm"
        :schema="expenseMutationSchema"
        :state="state"
        class="grid items-stretch gap-4 md:grid-cols-2"
        @submit="onSubmit"
      >
        <DetailCard
          title="Datos del gasto"
          icon="i-lucide-receipt-text"
          :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <UFormField name="expenseDate" label="Fecha" required>
                <CalendarDatePicker
                  v-model="expenseDate"
                  :time-zone="timeZone"
                  :format-value="formatExpenseDate"
                  placeholder="Selecciona una fecha"
                  class="w-full justify-start font-normal"
                />
              </UFormField>
              <UFormField name="category" label="Categoría" required>
                <USelect
                  v-model="state.category"
                  :items="categoryOptions"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
            </div>
            <UFormField name="description" label="Concepto" required>
              <UInput
                v-model="state.description"
                placeholder="¿Qué se pagó?"
                class="w-full"
              />
            </UFormField>
            <UFormField name="vendor" label="Proveedor" hint="Opcional">
              <UInput v-model="state.vendor" placeholder="Nombre del proveedor" class="w-full" />
            </UFormField>
          </div>
        </DetailCard>

        <DetailCard
          title="Asignación"
          :icon="state.assignmentType === 'GLOBAL' ? 'i-lucide-globe' : 'i-lucide-building-2'"
          :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="space-y-4">
            <UFormField v-if="fixedOrder" label="Orden de trabajo">
              <p class="font-medium break-words text-primary">
                {{ fixedOrder.orderNumber }} · {{ fixedOrder.customerName }}
              </p>
              <p class="mt-1 text-xs break-words text-muted">
                {{ fixedOrder.vehicleLabel }}
              </p>
            </UFormField>
            <template v-else>
              <UFormField name="assignmentType" label="¿A quién corresponde?" required>
                <USelectMenu
                  v-model="expenseScope"
                  :items="scopeOptions"
                  value-key="value"
                  :search-input="false"
                  class="w-full"
                  :ui="{ value: 'truncate' }"
                />
              </UFormField>
              <p v-if="state.assignmentType === 'GLOBAL'" class="text-sm text-muted">
                Se descuenta una sola vez del consolidado, sin asignarse a un taller ni a una orden.
              </p>
              <UFormField
                v-else
                name="assignmentType"
                label="Aplicar a"
                required
              >
                <URadioGroup
                  v-model="state.assignmentType"
                  :items="assignmentOptions"
                  value-key="value"
                  variant="card"
                  indicator="hidden"
                  :ui="{
                    fieldset: 'grid grid-cols-2 gap-1 rounded-lg bg-elevated p-1 ring ring-default',
                    item: 'min-w-0 justify-center rounded-md border-0 px-3 py-2 transition-colors hover:bg-default/60 has-data-[state=checked]:bg-default has-data-[state=checked]:shadow-xs focus-within:ring-2 focus-within:ring-primary',
                    container: 'size-0',
                    wrapper: 'w-full',
                    label: 'text-sm'
                  }"
                >
                  <template #label="{ item }">
                    <span
                      class="flex min-h-7 items-center justify-center gap-2"
                      :class="state.assignmentType === item.value ? 'text-primary' : 'text-muted'"
                    >
                      <UIcon
                        :name="item.value === 'WORKSHOP' ? 'i-lucide-building-2' : 'i-lucide-clipboard-list'"
                        class="size-4 shrink-0"
                      />
                      <span class="text-balance">{{ item.label }}</span>
                    </span>
                  </template>
                </URadioGroup>
              </UFormField>
              <UFormField
                v-if="state.assignmentType !== 'GLOBAL'"
                name="orderId"
                label="Orden de trabajo"
                :required="state.assignmentType === 'ORDER'"
                :ui="{ label: state.assignmentType === 'WORKSHOP' ? 'text-dimmed' : undefined }"
              >
                <UTooltip
                  text="Selecciona Orden de trabajo para poder seleccionar una orden"
                  :disabled="state.assignmentType === 'ORDER'"
                >
                  <span class="block min-w-0 w-full" :tabindex="state.assignmentType === 'WORKSHOP' ? 0 : undefined">
                    <USelectMenu
                      v-model="state.orderId"
                      :items="orderOptions"
                      value-key="value"
                      searchable
                      :disabled="state.assignmentType !== 'ORDER'"
                      placeholder="Buscar orden, cliente o vehículo…"
                      class="min-w-0 w-full"
                      :ui="{
                        base: 'disabled:bg-elevated/50 disabled:text-dimmed',
                        placeholder: state.assignmentType === 'WORKSHOP' ? 'text-dimmed' : undefined,
                        value: 'min-w-0 truncate',
                        itemLabel: 'min-w-0 truncate'
                      }"
                    />
                  </span>
                </UTooltip>
              </UFormField>
            </template>
          </div>
        </DetailCard>

        <DetailCard
          title="Importe y pago"
          class="md:col-span-2"
          icon="i-lucide-wallet"
          :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MoneyFormFields
              v-model:currency="state.currency"
              v-model:rate="state.exchangeRate"
              v-model:amount="state.amount"
              :currencies="currencyOptions"
              :rate-disabled="state.currency === 'MXN'"
              :rate-required="state.currency === 'USD'"
              :disabled="loading || deleting"
            />
            <UFormField name="method" label="Método de pago" required>
              <USelect
                v-model="state.method"
                :items="methodOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="notes"
              label="Notas"
              hint="Opcional"
              class="col-span-2 md:col-span-4"
            >
              <UTextarea
                v-model="state.notes"
                placeholder="Detalles adicionales del gasto"
                class="w-full"
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>
        </DetailCard>
      </UForm>
    </template>
    <template #footer>
      <AppButton
        v-if="isEditing"
        ref="deleteButton"
        label="Eliminar gasto"
        icon="i-lucide-trash-2"
        intent="danger"
        variant="ghost"
        class="mr-auto"
        :disabled="loading || deleting"
        @click="openDeleteConfirmation"
      />
      <AppButton
        type="submit"
        form="expense-form"
        :label="submitLabel"
        icon="i-lucide-check"
        :loading="loading"
        :disabled="deleting || deleteConfirmationOpen"
      />
    </template>
  </UModal>

  <DestructiveConfirmModal
    v-model:open="deleteConfirmationOpen"
    title="Eliminar gasto"
    :description="`¿Deseas eliminar el gasto «${expense?.description}»? Esta acción no se puede deshacer.`"
    confirm-label="Sí, eliminar gasto"
    confirm-icon="i-lucide-trash-2"
    :close="false"
    :dismissible="false"
    :loading="deleting"
    :error="deleteError"
    @confirm="removeExpense"
    @after-close="restoreDeleteFocus"
  />
</template>
