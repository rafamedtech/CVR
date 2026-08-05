<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { OrderPayment } from '~/types/crm'

const responsiveControlSize = useResponsiveControlSize()
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
const methodOptions = Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))
const amountFormatOptions: Intl.NumberFormatOptions = {
  maximumFractionDigits: 2
}
const schema = z.object({
  amount: z.coerce.number()
    .positive('Escribe un importe válido.')
    .refine(amount => amount <= props.balance, 'El importe no puede superar el saldo pendiente.'),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'CREDIT', 'OTHER']),
  reference: z.string().optional(),
  notes: z.string().optional()
})
type PaymentSchema = z.output<typeof schema>
const state = reactive<PaymentSchema>({
  amount: 0,
  method: 'CASH',
  reference: '',
  notes: ''
})

watch(open, (value) => {
  if (value) state.amount = props.balance
})

async function onSubmit(event: FormSubmitEvent<PaymentSchema>) {
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
            {{ formatDate(payment.paidAt, true) }} · {{ payment.recordedByName }}
          </p>
          <p v-if="payment.reference" class="text-xs text-muted">
            Ref. {{ payment.reference }}
          </p>
        </div>
        <span class="font-semibold text-success">{{ formatCurrency(payment.amount) }}</span>
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
            <UFormField name="amount" label="Importe" required>
              <UInputNumber
                v-model="state.amount"
                :min="0.01"
                :max="balance"
                :step="1"
                :step-snapping="false"
                :format-options="amountFormatOptions"
                locale="es-MX"
                :size="responsiveControlSize"
                class="w-full"
              />
            </UFormField>
            <UFormField name="method" label="Método de pago" required>
              <USelect
                v-model="state.method"
                :items="methodOptions"
                value-key="value"
                :size="responsiveControlSize"
                class="w-full"
              />
            </UFormField>
          </div>
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
