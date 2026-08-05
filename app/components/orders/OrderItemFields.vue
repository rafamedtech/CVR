<script setup lang="ts">
import type { OrderItemDraft } from '~/types/crm'

type OrderItemField = 'type' | 'description' | 'quantity' | 'unitCost' | 'unitPrice'

const props = defineProps<{
  namePrefix?: string
}>()
const item = defineModel<OrderItemDraft>({ required: true })
const responsiveControlSize = useResponsiveControlSize()
const typeOptions = Object.entries(lineItemTypeLabels).map(([value, label]) => ({ value, label }))
const quantityFormatOptions: Intl.NumberFormatOptions = {
  maximumFractionDigits: 2
}
const currencyFormatOptions: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'MXN',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}
const centeredCurrencyInputUi = {
  base: 'text-center'
}

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
        :size="responsiveControlSize"
        class="w-full"
      />
    </UFormField>
    <UFormField :name="fieldName('description')" label="Descripción" class="sm:col-span-4">
      <UInput v-model="item.description" class="w-full" />
    </UFormField>
    <UFormField :name="fieldName('quantity')" label="Cantidad" class="sm:col-span-2">
      <UInputNumber
        v-model="item.quantity"
        :min="0.01"
        :step="1"
        :step-snapping="false"
        :format-options="quantityFormatOptions"
        :decrement-disabled="item.quantity === 1"
        locale="es-MX"
        class="w-full"
      />
    </UFormField>
    <UFormField :name="fieldName('unitCost')" label="Costo unitario" class="sm:col-span-2">
      <UInputNumber
        v-model="item.unitCost"
        :min="0"
        :step="0.01"
        :format-options="currencyFormatOptions"
        :increment="false"
        :decrement="false"
        locale="es-MX"
        :ui="centeredCurrencyInputUi"
        class="w-full"
      />
    </UFormField>
    <UFormField :name="fieldName('unitPrice')" label="Precio unitario" class="sm:col-span-2">
      <UInputNumber
        v-model="item.unitPrice"
        :min="0"
        :step="0.01"
        :format-options="currencyFormatOptions"
        :increment="false"
        :decrement="false"
        locale="es-MX"
        :ui="centeredCurrencyInputUi"
        class="w-full"
      />
    </UFormField>
  </div>
</template>
