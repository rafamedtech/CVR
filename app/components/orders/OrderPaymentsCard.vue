<script setup lang="ts">
import { deletionReasonSchema } from '#shared/audit'
import { formatDateOnly } from '#shared/date'
import { parseDate, today, type DateValue } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Currency, OrderPayment } from '~/types/crm'
import { convertFromMxn, convertToMxn } from '#shared/currency'
import { paymentFormSchema, type PaymentForm } from '#shared/payment'
import { currencyOptions } from '~/utils/crm'
import { DEFAULT_WORKSHOP_TIME_ZONE } from '~/utils/datetime'

const { workshopTimeZone } = useCrmSession()

const props = defineProps<{
  orderId: string
  workshopId: string
  payments: OrderPayment[]
  balance: number
  total: number
  canRecord?: boolean
}>()
const emit = defineEmits<{ updated: [] }>()
const toast = useToast()
const open = shallowRef(false)
const loading = shallowRef(false)
const deleting = shallowRef(false)
const deleteConfirmationOpen = shallowRef(false)
const initializing = shallowRef(false)
const editingPayment = shallowRef<OrderPayment | null>(null)
const deleteError = shallowRef('')
const deleteReason = shallowRef('')
const deleteReasonValid = computed(() => deletionReasonSchema.safeParse({ reason: deleteReason.value }).success)
const deleteButton = useTemplateRef<{ $el: HTMLElement }>('deleteButton')
const timeZone = computed(() => workshopTimeZone(props.workshopId) ?? DEFAULT_WORKSHOP_TIME_ZONE)
const defaultPaymentDate = today(timeZone.value)
const paymentDate = shallowRef<DateValue | undefined>(defaultPaymentDate)
const methodOptions = Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))
const state = reactive<PaymentForm>({
  amount: 0,
  currency: 'MXN',
  exchangeRate: 1,
  method: 'CASH',
  paidAt: `${defaultPaymentDate.toString()}T12:00:00`,
  reference: '',
  notes: ''
})

const isEditing = computed(() => editingPayment.value !== null)
const modalTitle = computed(() => isEditing.value ? 'Editar pago' : 'Registrar pago')
const modalDescription = computed(() => isEditing.value
  ? 'Actualiza la información del pago registrado.'
  : 'Los pagos se descuentan del saldo pendiente de la orden.')
const submitLabel = computed(() => isEditing.value ? 'Guardar cambios' : 'Guardar pago')
const deleteConfirmationDescription = computed(() => editingPayment.value
  ? `Se eliminará el pago de ${formatCurrency(editingPayment.value.amount, editingPayment.value.currency)}. Esta acción no se puede deshacer.`
  : 'Esta acción no se puede deshacer.')
const availableBalanceMxn = computed(() => props.balance + (editingPayment.value?.amountMxn ?? 0))
const paymentEquivalentMxn = computed(() => convertToMxn(state.amount, state.currency, state.exchangeRate))
const maximumPayment = computed(() => state.exchangeRate > 0
  ? convertFromMxn(availableBalanceMxn.value, state.currency, state.exchangeRate)
  : 0)

function formatPaymentDate(date: DateValue | undefined) {
  if (!date) return 'Selecciona una fecha'

  return formatDateOnly(date.toString())
}

function finishInitialization() {
  nextTick(() => initializing.value = false)
}

function openCreateModal() {
  const currentDate = today(timeZone.value)
  editingPayment.value = null
  deleteConfirmationOpen.value = false
  initializing.value = true
  Object.assign(state, {
    amount: props.balance,
    currency: 'MXN',
    exchangeRate: 1,
    method: 'CASH',
    paidAt: `${currentDate.toString()}T12:00:00`,
    reference: '',
    notes: ''
  })
  paymentDate.value = currentDate
  open.value = true
  finishInitialization()
}

function openEditModal(payment: OrderPayment) {
  if (!props.canRecord) return

  const date = parseDate(payment.paidAt.slice(0, 10))
  editingPayment.value = payment
  deleteConfirmationOpen.value = false
  initializing.value = true
  Object.assign(state, {
    amount: payment.amount,
    currency: payment.currency,
    exchangeRate: payment.exchangeRate,
    method: payment.method,
    paidAt: `${date.toString()}T12:00:00`,
    reference: payment.reference ?? '',
    notes: payment.notes ?? ''
  })
  paymentDate.value = date
  open.value = true
  finishInitialization()
}

watch(paymentDate, (date) => {
  state.paidAt = date ? `${date.toString()}T12:00:00` : ''
})

watch(() => state.currency, (currency: Currency) => {
  if (initializing.value) return
  if (currency === 'MXN') state.exchangeRate = 1
  state.amount = maximumPayment.value
})

watch(() => state.exchangeRate, () => {
  if (initializing.value) return
  if (state.currency === 'USD' && state.amount > maximumPayment.value) {
    state.amount = maximumPayment.value
  }
})

async function onSubmit(event: FormSubmitEvent<PaymentForm>) {
  if (loading.value || deleting.value || deleteConfirmationOpen.value) return
  if (paymentEquivalentMxn.value > availableBalanceMxn.value + 0.01) {
    toast.add({ title: 'El importe no puede superar el saldo disponible.', color: 'error' })
    return
  }
  loading.value = true
  try {
    if (editingPayment.value) {
      await $fetch(`/api/orders/${props.orderId}/payments/${editingPayment.value.id}`, {
        method: 'PATCH',
        body: event.data
      })
    } else {
      await $fetch(`/api/orders/${props.orderId}/payments`, { method: 'POST', body: event.data })
    }
    toast.add({
      title: isEditing.value ? 'Pago actualizado' : 'Pago registrado',
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
    emit('updated')
  } catch (error) {
    toast.add({
      title: isEditing.value ? 'No se pudo actualizar el pago' : 'No se pudo registrar el pago',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function openDeleteConfirmation() {
  deleteError.value = ''
  deleteReason.value = ''
  deleteConfirmationOpen.value = true
}

function restoreDeleteFocus() {
  if (open.value && !deleteConfirmationOpen.value) deleteButton.value?.$el.focus()
}

async function removePayment() {
  if (!editingPayment.value || loading.value || deleting.value || !deleteReasonValid.value) return

  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/orders/${props.orderId}/payments/${editingPayment.value.id}`, {
      method: 'DELETE',
      body: { reason: deleteReason.value }
    })
    toast.add({ title: 'Pago eliminado', color: 'success', icon: 'i-lucide-check' })
    deleteConfirmationOpen.value = false
    open.value = false
    emit('updated')
  } catch (error) {
    deleteError.value = getApiErrorMessage(error) || 'No se pudo eliminar el pago.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <DetailCard :ui="{ container: 'p-4 sm:p-5 gap-0' }">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="flex items-center gap-2 text-xs text-muted uppercase">
            <span class="h-3.5 w-1 rounded-full bg-success" aria-hidden="true" />
            Total pagado · MXN
          </p>
          <p class="mt-2 text-2xl font-semibold tracking-tight break-words text-success tabular-nums">
            {{ formatCurrency(total - balance) }}
          </p>
          <p class="mt-1 text-xs text-muted">
            {{ payments.length }} {{ payments.length === 1 ? 'movimiento registrado' : 'movimientos registrados' }}
          </p>
        </div>
        <UButton
          v-if="canRecord"
          label="Registrar pago"
          icon="i-lucide-hand-coins"
          :disabled="balance <= 0"
          @click="openCreateModal"
        />
      </div>
      <dl class="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t border-default pt-3">
        <div>
          <dt class="text-xs text-muted">
            Total de la orden
          </dt>
          <dd class="mt-0.5 font-medium text-highlighted tabular-nums">
            {{ formatCurrency(total) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Saldo pendiente
          </dt>
          <dd class="mt-0.5 font-semibold tabular-nums" :class="balance > 0 ? 'text-warning' : 'text-success'">
            {{ formatCurrency(balance) }}
          </dd>
        </div>
      </dl>
    </DetailCard>

    <div v-if="payments.length" class="space-y-3">
      <DetailCard
        v-for="payment in payments"
        :key="payment.id"
        as="article"
        :aria-labelledby="`order-payment-${payment.id}`"
        :ui="{ container: 'p-4 sm:p-5 gap-0' }"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h3 :id="`order-payment-${payment.id}`" class="font-semibold break-words text-primary">
              {{ paymentMethodLabels[payment.method] }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ formatDate(payment.paidAt, false, workshopTimeZone(workshopId)) }}
            </p>
          </div>
          <div class="min-w-0 text-right">
            <p class="text-xs text-muted">
              Importe
            </p>
            <p class="mt-0.5 text-lg font-semibold text-success tabular-nums">
              {{ formatCurrency(payment.amount, payment.currency) }}
            </p>
          </div>
        </div>
        <p v-if="payment.currency === 'USD'" class="mt-2 text-xs text-muted tabular-nums">
          TC {{ payment.exchangeRate.toFixed(4) }} · {{ formatCurrency(payment.amountMxn) }} MXN
        </p>

        <dl class="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-default pt-3">
          <div v-if="payment.reference" class="min-w-0">
            <dt class="mb-1 text-xs text-muted">
              Referencia
            </dt>
            <dd class="text-sm break-words text-highlighted">
              {{ payment.reference }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="mb-1 text-xs text-muted">
              Registró
            </dt>
            <dd class="text-sm break-words text-highlighted">
              {{ payment.recordedByName }}
            </dd>
          </div>
          <UButton
            v-if="canRecord"
            label="Editar"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
            class="ml-auto"
            :aria-label="`Editar pago del ${formatDate(payment.paidAt, false, workshopTimeZone(workshopId))}`"
            @click="openEditModal(payment)"
          />
        </dl>
      </DetailCard>
    </div>
    <DetailCard v-else :ui="{ container: 'p-6 sm:p-8 gap-0' }">
      <div class="text-center">
        <UIcon name="i-lucide-hand-coins" class="size-9 text-dimmed" />
        <h3 class="mt-3 font-semibold text-primary">
          Sin pagos registrados
        </h3>
        <p class="mt-1 text-sm text-muted">
          Los pagos de esta orden aparecerán aquí.
        </p>
      </div>
    </DetailCard>

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
          id="payment-form"
          :schema="paymentFormSchema"
          :state="state"
          class="grid items-stretch gap-4 md:grid-cols-2"
          @submit="onSubmit"
        >
          <DetailCard
            title="Datos del pago"
            icon="i-lucide-hand-coins"
            :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
          >
            <div class="space-y-4">
              <UFormField name="paidAt" label="Fecha del pago" required>
                <CalendarDatePicker
                  v-model="paymentDate"
                  :time-zone="timeZone"
                  :format-value="formatPaymentDate"
                  placeholder="Selecciona una fecha"
                  class="w-full justify-start font-normal"
                />
              </UFormField>
              <UFormField name="reference" label="Referencia" hint="Opcional">
                <UInput
                  v-model="state.reference"
                  placeholder="Folio, autorización o número de transferencia"
                  class="w-full"
                />
              </UFormField>
            </div>
          </DetailCard>

          <DetailCard
            title="Saldo de la orden"
            icon="i-lucide-wallet"
            :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
          >
            <dl class="space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">
                  Total de la orden
                </dt>
                <dd class="font-medium text-highlighted tabular-nums">
                  {{ formatCurrency(total) }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">
                  Pagado
                </dt>
                <dd class="font-medium text-success tabular-nums">
                  {{ formatCurrency(total - balance) }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3 border-t border-default pt-3">
                <dt class="text-muted">
                  {{ isEditing ? 'Disponible para este pago' : 'Saldo pendiente' }}
                </dt>
                <dd class="text-lg font-semibold text-warning tabular-nums">
                  {{ formatCurrency(availableBalanceMxn) }}
                </dd>
              </div>
            </dl>
          </DetailCard>

          <DetailCard
            title="Importe y método"
            class="md:col-span-2"
            icon="i-lucide-banknote"
            :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
          >
            <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
              <UFormField name="currency" label="Moneda" required>
                <USelect
                  v-model="state.currency"
                  :items="currencyOptions"
                  value-key="value"
                  :disabled="loading || deleting"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                name="exchangeRate"
                label="Tipo de cambio"
                :required="state.currency === 'USD'"
                :ui="{ label: state.currency === 'MXN' ? 'text-dimmed' : undefined }"
              >
                <AppNumberInput
                  v-model="state.exchangeRate"
                  :disabled="loading || deleting || state.currency === 'MXN'"
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
                  :disabled="loading || deleting"
                  :min="0.01"
                  :max="maximumPayment"
                  :step="1"
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
              <p
                v-if="state.currency === 'USD'"
                class="col-span-2 flex items-center gap-2 text-xs text-muted tabular-nums md:col-span-4"
              >
                <UIcon name="i-lucide-arrow-left-right" class="size-3.5 shrink-0" />
                Equivalente aplicado: {{ formatCurrency(paymentEquivalentMxn) }} MXN
              </p>
              <UFormField
                name="notes"
                label="Notas"
                hint="Opcional"
                class="col-span-2 md:col-span-4"
              >
                <UTextarea
                  v-model="state.notes"
                  placeholder="Detalles adicionales del pago"
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
          label="Eliminar pago"
          icon="i-lucide-trash-2"
          intent="danger"
          variant="ghost"
          class="mr-auto"
          :disabled="loading || deleting"
          @click="openDeleteConfirmation"
        />
        <AppButton
          type="submit"
          form="payment-form"
          :label="submitLabel"
          icon="i-lucide-check"
          :loading="loading"
          :disabled="deleting || deleteConfirmationOpen"
        />
      </template>
    </UModal>

    <DestructiveConfirmModal
      v-model:open="deleteConfirmationOpen"
      title="Eliminar pago"
      :description="deleteConfirmationDescription"
      confirm-label="Sí, eliminar pago"
      confirm-icon="i-lucide-trash-2"
      :close="false"
      :dismissible="false"
      :confirm-disabled="!deleteReasonValid"
      :loading="deleting"
      :error="deleteError"
      @confirm="removePayment"
      @after-close="restoreDeleteFocus"
    >
      <template #reason="{ loading: removing }">
        <DeletionReasonField v-model="deleteReason" :disabled="removing" />
      </template>
    </DestructiveConfirmModal>
  </div>
</template>
