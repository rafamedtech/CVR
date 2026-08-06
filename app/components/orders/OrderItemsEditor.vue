<script setup lang="ts">
import type { OrderItemDraft, TaxRate } from '~/types/crm'

const props = defineProps<{
  taxRate: TaxRate
}>()

const items = defineModel<OrderItemDraft[]>({ required: true })

watch(() => props.taxRate, (taxRate) => {
  for (const item of items.value) {
    item.taxRate = taxRate
  }
}, { immediate: true })

function addItem() {
  items.value.push({
    type: 'SERVICE',
    description: '',
    quantity: 1,
    unitCost: 0,
    unitPrice: 0,
    discount: 0,
    taxRate: props.taxRate
  })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function lineTotal(item: OrderItemDraft) {
  const subtotal = Math.max(0, Number(item.quantity || 0) * Number(item.unitPrice || 0) - Number(item.discount || 0))
  return subtotal * (1 + Number(item.taxRate || 0) / 100)
}
</script>

<template>
  <div class="space-y-3">
    <h3 class="font-medium text-highlighted">
      Servicios y partes
    </h3>

    <div
      v-for="(item, index) in items"
      :key="index"
      class="rounded-xl border border-default bg-elevated/30 p-4"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-highlighted">
          Concepto {{ index + 1 }}
        </p>
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          aria-label="Eliminar concepto"
          @click="removeItem(index)"
        />
      </div>
      <OrdersOrderItemFields
        :model-value="item"
        :name-prefix="`items.${index}`"
        @update:model-value="items[index] = $event"
      />
      <div class="mt-3 flex justify-end">
        <div class="text-right">
          <p class="text-xs text-muted">
            Total del concepto
          </p>
          <p class="font-semibold text-highlighted">
            {{ formatCurrency(lineTotal(item)) }}
          </p>
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <UButton
        label="Agregar concepto"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        class="w-full justify-center md:w-auto"
        @click="addItem"
      />
    </div>

    <UAlert
      v-if="!items.length"
      title="Puedes guardar la cotización sin conceptos"
      description="Agrega los servicios y partes ahora o desde el detalle de la orden."
      icon="i-lucide-info"
      color="neutral"
      variant="subtle"
    />
  </div>
</template>
