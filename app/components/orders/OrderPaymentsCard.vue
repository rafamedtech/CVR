<script setup lang="ts">
import { z } from 'zod'
import { getLocalTimeZone, today, type CalendarDate } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Currency, OrderPayment } from '~/types/crm'
import { convertFromMxn, convertToMxn } from '#shared/currency'
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
const open = shallowRef(false)
const loading = shallowRef(false)
const defaultPaymentDate = today(getLocalTimeZone())
const paymentDate = shallowRef<CalendarDate | undefined>(defaultPaymentDate)
const paymentDateOpen = shallowRef(false)
const methodOptions = Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))
const schema = z.object({
  amount: z.coerce.number()
    .positive('Escribe un importe válido.'),
  currency: z.enum(['MXN', 'USD']),
  exchangeRate: z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.'),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'CREDIT', 'OTHER']),
  paidAt: z.string().min(1, 'Selecciona la fecha del pago.'),
  reference: z.string().optional(),
  notes: z.string().optional()
})
type PaymentSchema = z.output<typeof schema>
const state = reactive<PaymentSchema>({
  amount: 0,
  currency: 'MXN',
  exchangeRate: 1,
  method: 'CASH',
  paidAt: `${defaultPaymentDate.toString()}T12:00:00`,
  reference: '',
  notes: ''
})

const paymentEquivalentMxn = computed(() => convertToMxn(state.amount, state.currency, state.exchangeRate))
const maximumPayment = computed(() => state.exchangeRate > 0
  ? convertFromMxn(props.balance, state.currency, state.exchangeRate)
  : 0)

function formatPaymentDate(date: CalendarDate | undefined) {
  if (!date) return 'Selecciona una fecha'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium'
  }).format(date.toDate(getLocalTimeZone()))
}

watch(open, (value) => {
  if (value) {
    const currentDate = today(getLocalTimeZone())
    state.currency = 'MXN'
    state.exchangeRate = 1
    state.amount = props.balance
    state.paidAt = `${currentDate.toString()}T12:00:00`
    paymentDate.value = currentDate
    paymentDateOpen.value = false
  }
})

watch(paymentDate, (date) => {
  state.paidAt = date ? `${date.toString()}T12:00:00` : ''
})

watch(() => state.currency, (currency: Currency) => {
  if (currency === 'MXN') state.exchangeRate = 1
  state.amount = maximumPayment.value
})

watch(() => state.exchangeRate, () => {
  if (state.currency === 'USD' && state.amount > maximumPayment.value) {
    state.amount = maximumPayment.value
  }
})

async function onSubmit(event: FormSubmitEvent<PaymentSchema>) {
  if (paymentEquivalentMxn.value > props.balance + 0.01) {
    toast.add({ title: 'El importe no puede superar el saldo pendiente.', color: 'error' })
    return
  }
  loading.value = true
  try {
    await $fetch(`/api/orders/${props.orderId}/payments`, { method: 'POST', body: event.data })
    toast.add({ title: 'Pago registrado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('updated')
  } catch (error) {
    toast.add({ title: 'No se pudo registrar el pago', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
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
          @click="open = true"
        />
      </div>
    </template>

    <div v-if="payments.length" class="divide-y divide-default">
      <div v-for="payment in payments" :key="payment.id" class="flex items-start justify-between gap-3 py-3 first:pt-0">
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
        <div class="text-right">
          <p class="font-semibold text-success">
            {{ formatCurrency(payment.amount, payment.currency) }}
          </p>
          <p v-if="payment.currency === 'USD'" class="text-xs text-muted">
            TC {{ payment.exchangeRate.toFixed(4) }} · {{ formatCurrency(payment.amountMxn) }} MXN
          </p>
        </div>
      </div>
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

    <UModal v-model:open="open" title="Registrar pago" :ui="{ footer: 'justify-end' }">
      <template #body>
        <UForm
          id="payment-form"
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UAlert
            :title="`Saldo pendiente: ${formatCurrency(balance)}`"
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
          @click="close"
        />
        <UButton
          type="submit"
          form="payment-form"
          label="Registrar pago"
          :loading="loading"
        />
      </template>
    </UModal>
  </UCard>
</template>
