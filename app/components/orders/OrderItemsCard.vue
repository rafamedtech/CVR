<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { OrderLineItem } from '~/types/crm'

const props = defineProps<{
  orderId: string
  items: OrderLineItem[]
  subtotal: number
  taxTotal: number
  total: number
  canEdit?: boolean
}>()
const emit = defineEmits<{ updated: [] }>()
const toast = useToast()
const open = shallowRef(false)
const loading = shallowRef(false)
const deleting = shallowRef<string | null>(null)
const typeOptions = Object.entries(lineItemTypeLabels).map(([value, label]) => ({ value, label }))

const schema = z.object({
  type: z.enum(['SERVICE', 'PART', 'LABOR', 'OTHER']),
  description: z.string().min(2, 'Describe el concepto.'),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().min(0).max(100)
})
type ItemSchema = z.output<typeof schema>
const state = reactive<ItemSchema>({
  type: 'SERVICE',
  description: '',
  quantity: 1,
  unitCost: 0,
  unitPrice: 0,
  discount: 0,
  taxRate: 16
})

async function onSubmit(event: FormSubmitEvent<ItemSchema>) {
  loading.value = true
  try {
    await $fetch(`/api/orders/${props.orderId}/items`, { method: 'POST', body: event.data })
    toast.add({ title: 'Concepto agregado', color: 'success' })
    open.value = false
    Object.assign(state, {
      type: 'SERVICE',
      description: '',
      quantity: 1,
      unitCost: 0,
      unitPrice: 0,
      discount: 0,
      taxRate: 16
    })
    emit('updated')
  } catch (error) {
    toast.add({ title: 'No se pudo agregar el concepto', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function removeItem(itemId: string) {
  deleting.value = itemId
  try {
    await $fetch(`/api/orders/${props.orderId}/items/${itemId}`, { method: 'DELETE' })
    toast.add({ title: 'Concepto eliminado', color: 'success' })
    emit('updated')
  } catch (error) {
    toast.add({ title: 'No se pudo eliminar', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">
            Servicios y partes
          </h2>
          <p class="text-sm text-muted">
            {{ items.length }} conceptos en la orden
          </p>
        </div>
        <UButton
          v-if="canEdit"
          label="Agregar"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          @click="open = true"
        />
      </div>
    </template>

    <div v-if="items.length" class="divide-y divide-default">
      <div v-for="item in items" :key="item.id" class="flex items-start justify-between gap-4 py-3 first:pt-0">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-medium text-highlighted">
              {{ item.description }}
            </p>
            <UBadge
              :label="lineItemTypeLabels[item.type]"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </div>
          <p class="text-xs text-muted">
            {{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}
            <span v-if="item.discount"> · Descuento {{ formatCurrency(item.discount) }}</span>
            · IVA {{ item.taxRate }}%
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span class="font-medium text-highlighted">{{ formatCurrency(item.total) }}</span>
          <UButton
            v-if="canEdit"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            :loading="deleting === item.id"
            aria-label="Eliminar concepto"
            @click="removeItem(item.id)"
          />
        </div>
      </div>
    </div>
    <div v-else class="py-8 text-center text-sm text-muted">
      Aún no hay conceptos.
    </div>

    <template #footer>
      <dl class="ml-auto grid max-w-xs grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <dt class="text-muted">
          Subtotal
        </dt>
        <dd class="text-right text-default">
          {{ formatCurrency(subtotal) }}
        </dd>
        <dt class="text-muted">
          IVA
        </dt>
        <dd class="text-right text-default">
          {{ formatCurrency(taxTotal) }}
        </dd>
        <dt class="font-semibold text-highlighted">
          Total
        </dt>
        <dd class="text-right text-lg font-semibold text-highlighted">
          {{ formatCurrency(total) }}
        </dd>
      </dl>
    </template>

    <UModal v-model:open="open" title="Agregar concepto" :ui="{ footer: 'justify-end' }">
      <template #body>
        <UForm
          id="item-form"
          :schema="schema"
          :state="state"
          class="grid gap-4 sm:grid-cols-2"
          @submit="onSubmit"
        >
          <UFormField name="type" label="Tipo">
            <USelect
              v-model="state.type"
              :items="typeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField name="quantity" label="Cantidad">
            <UInput
              v-model="state.quantity"
              type="number"
              min="0.01"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField name="description" label="Descripción" class="sm:col-span-2">
            <UInput v-model="state.description" class="w-full" />
          </UFormField>
          <UFormField name="unitCost" label="Costo unitario">
            <UInput
              v-model="state.unitCost"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField name="unitPrice" label="Precio unitario">
            <UInput
              v-model="state.unitPrice"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField name="discount" label="Descuento">
            <UInput
              v-model="state.discount"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField name="taxRate" label="IVA (%)">
            <UInput
              v-model="state.taxRate"
              type="number"
              min="0"
              max="100"
              class="w-full"
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
          form="item-form"
          label="Agregar concepto"
          :loading="loading"
        />
      </template>
    </UModal>
  </UCard>
</template>
