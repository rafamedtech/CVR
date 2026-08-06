<script setup lang="ts">
import type { OrderItemDraft } from '~/types/crm'

type OrderItemField = 'type' | 'description' | 'quantity' | 'unitCost' | 'unitPrice'

const props = defineProps<{
  namePrefix?: string
}>()
const item = defineModel<OrderItemDraft>({ required: true })
const typeOptions = Object.entries(lineItemTypeLabels).map(([value, label]) => ({ value, label }))

function fieldName(field: OrderItemField) {
  return props.namePrefix ? `${props.namePrefix}.${field}` : field
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-6">
    <UFormField :name="fieldName('type')" label="Tipo" class="sm:col-span-2">
      <USelect
        v-model="item.type"
        :items="typeOptions"
        value-key="value"
        class="w-full"
      />
    </UFormField>
    <UFormField :name="fieldName('description')" label="Descripción" class="sm:col-span-4">
      <UInput v-model="item.description" class="w-full" />
    </UFormField>
    <UFormField :name="fieldName('quantity')" label="Cantidad" class="sm:col-span-2">
      <AppNumberInput
        v-model="item.quantity"
        :min="0.01"
        :step="1"
        :step-snapping="false"
        :decrement-disabled="item.quantity === 1"
      />
    </UFormField>
    <UFormField :name="fieldName('unitCost')" label="Costo unitario" class="sm:col-span-2">
      <AppNumberInput
        v-model="item.unitCost"
        format="currency"
        :min="0"
        :step="0.01"
        centered
      />
    </UFormField>
    <UFormField :name="fieldName('unitPrice')" label="Precio unitario" class="sm:col-span-2">
      <AppNumberInput
        v-model="item.unitPrice"
        format="currency"
        :min="0"
        :step="0.01"
        centered
      />
    </UFormField>
  </div>
</template>
