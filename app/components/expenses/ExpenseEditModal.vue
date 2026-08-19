<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ExpenseListItem } from '~/types/crm'

const props = defineProps<{
  expense: ExpenseListItem | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ updated: [] }>()

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

watch([open, () => props.expense], ([isOpen, expense]) => {
  if (!isOpen || !expense) return

  Object.assign(state, {
    category: expense.category,
    description: expense.description,
    vendor: expense.vendor ?? '',
    amount: expense.amount,
    expenseDate: expense.expenseDate.slice(0, 10),
    notes: expense.notes ?? ''
  })
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<ExpenseSchema>) {
  if (!props.expense) return

  loading.value = true
  try {
    await $fetch(`/api/expenses/${props.expense.id}`, {
      method: 'PATCH',
      body: event.data
    })
    toast.add({ title: 'Gasto actualizado', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('updated')
  } catch (error) {
    toast.add({
      title: 'No se pudo actualizar el gasto',
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
    title="Editar gasto"
    description="Actualiza la información del gasto registrado."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="expense-edit-form"
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
            <UInput
              v-model="state.expenseDate"
              type="date"
              class="w-full"
            />
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
            <AppNumberInput
              v-model="state.amount"
              format="currency"
              :min="0.01"
              :step="0.01"
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
        form="expense-edit-form"
        label="Guardar cambios"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
