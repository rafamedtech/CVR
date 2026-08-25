<script setup lang="ts">
import { z } from 'zod'
import type { DropdownMenuItem, FormSubmitEvent } from '@nuxt/ui'
import type { OrderItemDraft, OrderLineItem, TaxRate } from '~/types/crm'
import { convertFromMxn } from '#shared/currency'

const props = defineProps<{
  orderId: string
  items: OrderLineItem[]
  subtotal: number
  taxTotal: number
  total: number
  requiresInvoice: boolean
  canEdit?: boolean
}>()
const emit = defineEmits<{ updated: [] }>()
const toast = useToast()
const open = shallowRef(false)
const loading = shallowRef(false)
const deleting = shallowRef<string | null>(null)
const editingItemId = shallowRef<string | null>(null)

const schema = z.object({
  type: z.enum(['SERVICE', 'PART', 'LABOR', 'OTHER']),
  description: z.string().min(2, 'Describe el concepto.'),
  currency: z.enum(['MXN', 'USD']),
  exchangeRate: z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.'),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative()
})
type ItemSchema = z.output<typeof schema>
const state = ref<OrderItemDraft>({
  type: 'SERVICE',
  description: '',
  currency: 'MXN',
  exchangeRate: 1,
  quantity: 1,
  unitCost: 0,
  unitPrice: 0,
  discount: 0,
  taxRate: 0
})
const isEditing = computed(() => editingItemId.value !== null)
const modalTitle = computed(() => isEditing.value ? 'Editar concepto' : 'Agregar concepto')
const submitLabel = computed(() => isEditing.value ? 'Guardar cambios' : 'Agregar concepto')

function resetState() {
  Object.assign(state.value, {
    type: 'SERVICE',
    description: '',
    currency: 'MXN',
    exchangeRate: 1,
    quantity: 1,
    unitCost: 0,
    unitPrice: 0,
    discount: 0,
    taxRate: 0
  })
}

function openCreateModal() {
  editingItemId.value = null
  resetState()
  open.value = true
}

function openEditModal(item: OrderLineItem) {
  editingItemId.value = item.id
  Object.assign(state.value, {
    type: item.type,
    description: item.description,
    currency: item.currency,
    exchangeRate: item.exchangeRate,
    quantity: item.quantity,
    unitCost: item.unitCost,
    unitPrice: item.unitPrice,
    discount: item.discount,
    taxRate: item.taxRate as TaxRate
  })
  open.value = true
}

function itemTotalInOriginalCurrency(item: OrderLineItem) {
  return convertFromMxn(item.total, item.currency, item.exchangeRate)
}

function getItemActions(item: OrderLineItem): DropdownMenuItem[] {
  return [{
    label: 'Editar',
    icon: 'i-lucide-pencil',
    onSelect: () => openEditModal(item)
  }, {
    label: 'Quitar concepto',
    icon: 'i-lucide-trash-2',
    color: 'error',
    onSelect: () => removeItem(item.id)
  }]
}

async function onSubmit(event: FormSubmitEvent<ItemSchema>) {
  loading.value = true
  try {
    if (editingItemId.value) {
      await $fetch(`/api/orders/${props.orderId}/items/${editingItemId.value}`, {
        method: 'PATCH',
        body: event.data
      })
    } else {
      await $fetch(`/api/orders/${props.orderId}/items`, {
        method: 'POST',
        body: event.data
      })
    }
    toast.add({ title: isEditing.value ? 'Concepto actualizado' : 'Concepto agregado', color: 'success' })
    open.value = false
    editingItemId.value = null
    resetState()
    emit('updated')
  } catch (error) {
    toast.add({
      title: isEditing.value ? 'No se pudo actualizar el concepto' : 'No se pudo agregar el concepto',
      description: getApiErrorMessage(error),
      color: 'error'
    })
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
          @click="openCreateModal"
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
          </div>
          <p class="text-xs text-muted">
            {{ item.quantity }} × {{ formatCurrency(item.unitPrice, item.currency) }}
            <span v-if="item.discount"> · Descuento {{ formatCurrency(item.discount, item.currency) }}</span>
            <span v-if="item.currency === 'USD'"> · TC {{ item.exchangeRate.toFixed(4) }}</span>
            <span v-if="requiresInvoice"> · IVA {{ item.taxRate }}%</span>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <div class="text-right">
            <p class="font-medium text-highlighted">
              {{ formatCurrency(itemTotalInOriginalCurrency(item), item.currency) }}
            </p>
            <p v-if="item.currency === 'USD'" class="text-xs text-muted">
              {{ formatCurrency(item.total) }} MXN
            </p>
          </div>
          <UDropdownMenu
            v-if="canEdit"
            :items="getItemActions(item)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="primary"
              variant="ghost"
              :loading="deleting === item.id"
              aria-label="Acciones del concepto"
            />
          </UDropdownMenu>
        </div>
      </div>
    </div>
    <div v-else class="py-8 text-center text-sm text-muted">
      Aún no hay conceptos.
    </div>

    <template #footer>
      <dl class="ml-auto grid max-w-xs grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <dt v-if="requiresInvoice" class="text-muted">
          Subtotal
        </dt>
        <dd v-if="requiresInvoice" class="text-right text-default">
          {{ formatCurrency(subtotal) }}
        </dd>
        <dt v-if="requiresInvoice" class="text-muted">
          IVA
        </dt>
        <dd v-if="requiresInvoice" class="text-right text-default">
          {{ formatCurrency(taxTotal) }}
        </dd>
        <dt class="text-lg font-semibold text-primary">
          Total
        </dt>
        <dd class="text-right text-lg font-semibold text-primary">
          {{ formatCurrency(total) }}
        </dd>
      </dl>
    </template>

    <UModal
      v-model:open="open"
      :title="modalTitle"
      :ui="{ content: 'sm:max-w-[44.8rem]', footer: 'justify-end' }"
    >
      <template #body>
        <UForm
          id="item-form"
          :schema="schema"
          :state="state"
          :validate-on="[]"
          @submit="onSubmit"
        >
          <OrdersOrderItemFields v-model="state" />
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
          :label="submitLabel"
          :loading="loading"
        />
      </template>
    </UModal>
  </UCard>
</template>
