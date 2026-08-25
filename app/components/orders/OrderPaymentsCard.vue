<script setup lang="ts">
import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Currency, OrderPayment } from '~/types/crm'
import { convertFromMxn, convertToMxn } from '#shared/currency'
import { paymentFormSchema, type PaymentForm } from '#shared/payment'
import { currencyOptions } from '~/utils/crm'

const props = defineProps<{
  orderId: string
  payments: OrderPayment[]
  balance: number
  total: number
  canRecord?: boolean
}>()
const emit = defineEmits<{ updated: [] }>()
const toast = useToast()
const isMobileViewport = useMobileViewport()
const open = shallowRef(false)
const loading = shallowRef(false)
const deleting = shallowRef(false)
const deleteConfirmationOpen = shallowRef(false)
const initializing = shallowRef(false)
const editingPayment = shallowRef<OrderPayment | null>(null)
const defaultPaymentDate = today(getLocalTimeZone())
const paymentDate = shallowRef<CalendarDate | undefined>(defaultPaymentDate)
const paymentDateOpen = shallowRef(false)
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
const submitLabel = computed(() => isEditing.value
  ? (isMobileViewport.value ? 'Guardar' : 'Guardar cambios')
  : 'Registrar pago')
const deleteLabel = computed(() => isMobileViewport.value ? 'Eliminar' : 'Eliminar pago')
const deleteConfirmationDescription = computed(() => editingPayment.value
  ? `Se eliminará el pago de ${formatCurrency(editingPayment.value.amount, editingPayment.value.currency)}. Esta acción no se puede deshacer.`
  : 'Esta acción no se puede deshacer.')
const availableBalanceMxn = computed(() => props.balance + (editingPayment.value?.amountMxn ?? 0))
const paymentEquivalentMxn = computed(() => convertToMxn(state.amount, state.currency, state.exchangeRate))
const maximumPayment = computed(() => state.exchangeRate > 0
  ? convertFromMxn(availableBalanceMxn.value, state.currency, state.exchangeRate)
  : 0)

function formatPaymentDate(date: CalendarDate | undefined) {
  if (!date) return 'Selecciona una fecha'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium'
  }).format(date.toDate(getLocalTimeZone()))
}

function finishInitialization() {
  nextTick(() => initializing.value = false)
}

function openCreateModal() {
  const currentDate = today(getLocalTimeZone())
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
  paymentDateOpen.value = false
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
  paymentDateOpen.value = false
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

async function removePayment() {
  if (!editingPayment.value) return

  deleting.value = true
  try {
    await $fetch(`/api/orders/${props.orderId}/payments/${editingPayment.value.id}`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Pago eliminado', color: 'success', icon: 'i-lucide-check' })
    deleteConfirmationOpen.value = false
    open.value = false
    emit('updated')
  } catch (error) {
    toast.add({
      title: 'No se pudo eliminar el pago',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">
            Pagos
          </h2>
          <p class="text-sm text-muted">
            {{ payments.length }} movimientos
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
    </template>

    <div v-if="payments.length" class="divide-y divide-default">
      <button
        v-for="payment in payments"
        :key="payment.id"
        type="button"
        :disabled="!canRecord"
        class="group flex w-full items-start justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors first:pt-0 enabled:cursor-pointer enabled:hover:bg-elevated enabled:focus-visible:outline-2 enabled:focus-visible:outline-primary"
        @click="openEditModal(payment)"
      >
        <div>
          <p class="font-medium text-highlighted">
            {{ paymentMethodLabels[payment.method] }}
          </p>
          <p class="text-xs text-muted">
            {{ formatDate(payment.paidAt) }} · {{ payment.recordedByName }}
          </p>
          <p v-if="payment.reference" class="text-xs text-muted">
            Ref. {{ payment.reference }}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="font-semibold text-success">
            {{ formatCurrency(payment.amount, payment.currency) }}
          </p>
          <p v-if="payment.currency === 'USD'" class="text-xs text-muted">
            TC {{ payment.exchangeRate.toFixed(4) }} · {{ formatCurrency(payment.amountMxn) }} MXN
          </p>
        </div>
      </button>
    </div>
    <div v-else class="py-8 text-center text-sm text-muted">
      No hay pagos registrados.
    </div>

    <template #footer>
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">Pagado</span>
          <span class="font-medium text-success">{{ formatCurrency(total - balance) }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="font-medium text-highlighted">Saldo</span>
          <span class="text-lg font-semibold" :class="balance > 0 ? 'text-warning' : 'text-success'">
            {{ formatCurrency(balance) }}
          </span>
        </div>
      </div>
    </template>

    <UModal
      v-model:open="open"
      :title="modalTitle"
      :close="isEditing ? false : undefined"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <UForm
          id="payment-form"
          :schema="paymentFormSchema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UAlert
            :title="isEditing
              ? `Disponible para este pago: ${formatCurrency(availableBalanceMxn)}`
              : `Saldo pendiente: ${formatCurrency(balance)}`"
            icon="i-lucide-wallet"
            color="info"
            variant="subtle"
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField name="paidAt" label="Fecha del pago" required>
              <UPopover v-model:open="paymentDateOpen">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-calendar-days"
                  :label="formatPaymentDate(paymentDate)"
                  class="w-full justify-start font-normal"
                />

                <template #content>
                  <UCalendar
                    v-model="paymentDate"
                    locale="es-MX"
                    @update:model-value="paymentDateOpen = false"
                  />
                </template>
              </UPopover>
            </UFormField>
            <UFormField name="method" label="Método de pago" required>
              <USelect
                v-model="state.method"
                :items="methodOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField name="currency" label="Moneda" required>
              <USelect
                v-model="state.currency"
                :items="currencyOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="exchangeRate"
              label="Tipo de cambio"
              required
            >
              <AppNumberInput
                v-model="state.exchangeRate"
                :disabled="state.currency === 'MXN'"
                :min="0.000001"
                :step="0.01"
                :step-snapping="false"
                :maximum-fraction-digits="6"
              />
            </UFormField>
            <UFormField
              name="amount"
              label="Importe"
              required
              class="sm:col-span-2"
            >
              <AppNumberInput
                v-model="state.amount"
                format="currency"
                :currency="state.currency"
                :min="0.01"
                :max="maximumPayment"
                :step="1"
                :step-snapping="false"
              />
            </UFormField>
          </div>
          <UAlert
            v-if="state.currency === 'USD'"
            :title="`Equivalente aplicado: ${formatCurrency(paymentEquivalentMxn)} MXN`"
            icon="i-lucide-arrow-left-right"
            color="neutral"
            variant="subtle"
          />
          <UFormField name="reference" label="Referencia">
            <UInput v-model="state.reference" class="w-full" />
          </UFormField>
          <UFormField name="notes" label="Notas">
            <UTextarea
              v-model="state.notes"
              class="w-full"
              :rows="2"
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
          :disabled="loading || deleting"
          @click="close"
        />
        <UButton
          v-if="isEditing"
          :label="deleteLabel"
          color="error"
          variant="soft"
          :loading="deleting"
          :disabled="loading"
          @click="deleteConfirmationOpen = true"
        />
        <UButton
          type="submit"
          form="payment-form"
          :label="submitLabel"
          :loading="loading"
          :disabled="deleting"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="deleteConfirmationOpen"
      title="Eliminar pago"
      :description="deleteConfirmationDescription"
      :close="false"
      :dismissible="false"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer>
        <UButton
          label="Cancelar"
          color="neutral"
          variant="outline"
          :disabled="deleting"
          @click="deleteConfirmationOpen = false"
        />
        <UButton
          label="Sí, eliminar pago"
          icon="i-lucide-trash-2"
          color="error"
          :loading="deleting"
          @click="removePayment"
        />
      </template>
    </UModal>
  </UCard>
</template>
