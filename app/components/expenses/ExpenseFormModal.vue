<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const categoryOptions = Object.entries(expenseCategoryLabels).map(([value, label]) => ({ value, label }))
const schema = z.object({
  category: z.enum(['RENT', 'PAYROLL', 'UTILITIES', 'SUPPLIES', 'MAINTENANCE', 'MARKETING', 'TAXES', 'OTHER']),
  description: z.string().min(2, 'Describe el gasto.'),
  vendor: z.string().optional(),
  amount: z.coerce.number().positive('Escribe un importe válido.'),
  expenseDate: z.string().min(1, 'Selecciona la fecha.'),
  notes: z.string().optional()
})
type ExpenseSchema = z.output<typeof schema>
const state = reactive<ExpenseSchema>({
  category: 'OTHER',
  description: '',
  vendor: '',
  amount: 0,
  expenseDate: new Date().toISOString().slice(0, 10),
  notes: ''
})

async function onSubmit(event: FormSubmitEvent<ExpenseSchema>) {
  loading.value = true
  try {
    await $fetch('/api/expenses', { method: 'POST', body: event.data })
    toast.add({ title: 'Gasto registrado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('created')
  } catch (error) {
    toast.add({ title: 'No se pudo registrar el gasto', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Registrar gasto"
    description="Los gastos se descuentan para calcular la utilidad neta."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="expense-form"
        :schema="schema"
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
            <UInput v-model="state.expenseDate" type="date" class="w-full" />
          </UFormField>
        </div>
        <UFormField name="description" label="Descripción" required>
          <UInput v-model="state.description" class="w-full" />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField name="vendor" label="Proveedor">
            <UInput v-model="state.vendor" class="w-full" />
          </UFormField>
          <UFormField name="amount" label="Importe" required>
            <UInput
              v-model="state.amount"
              type="number"
              min="0.01"
              step="0.01"
              class="w-full"
            />
          </UFormField>
        </div>
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
        label="Guardar gasto"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
