<script setup lang="ts">
import type { OrderItemDraft, TaxRate } from '~/types/crm'
import { taxRateOptions } from '~/utils/crm'

const props = defineProps<{
  defaultTaxRate: TaxRate
}>()

const items = defineModel<OrderItemDraft[]>({ required: true })

const typeOptions = Object.entries(lineItemTypeLabels).map(([value, label]) => ({ value, label }))

function addItem() {
  items.value.push({
    type: 'SERVICE',
    description: '',
    quantity: 1,
    unitCost: 0,
    unitPrice: 0,
    discount: 0,
    taxRate: props.defaultTaxRate
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
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="font-medium text-highlighted">
          Servicios y partes
        </h3>
        <p class="text-xs text-muted">
          El costo se usa únicamente para calcular utilidad.
        </p>
      </div>
      <UButton
        label="Agregar concepto"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        size="sm"
        @click="addItem"
      />
    </div>

    <div
      v-for="(item, index) in items"
      :key="index"
      class="rounded-xl border border-default bg-elevated/30 p-4"
    >
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <UFormField :name="`items.${index}.type`" label="Tipo">
          <USelect
            v-model="item.type"
            :items="typeOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :name="`items.${index}.description`" label="Descripción" class="sm:col-span-2 lg:col-span-2">
          <UInput v-model="item.description" class="w-full" />
        </UFormField>
        <UFormField :name="`items.${index}.quantity`" label="Cantidad">
          <UInput
            v-model="item.quantity"
            type="number"
            min="0.01"
            step="0.01"
            class="w-full"
          />
        </UFormField>
        <UFormField :name="`items.${index}.unitCost`" label="Costo unitario">
          <UInput
            v-model="item.unitCost"
            type="number"
            min="0"
            step="0.01"
            class="w-full"
          />
        </UFormField>
        <UFormField :name="`items.${index}.unitPrice`" label="Precio unitario">
          <UInput
            v-model="item.unitPrice"
            type="number"
            min="0"
            step="0.01"
            class="w-full"
          />
        </UFormField>
      </div>
      <div class="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div class="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-sm">
          <UFormField :name="`items.${index}.discount`" label="Descuento">
            <UInput
              v-model="item.discount"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField :name="`items.${index}.taxRate`" label="IVA (%)">
            <USelect
              v-model="item.taxRate"
              :items="taxRateOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-xs text-muted">
              Total
            </p>
            <p class="font-semibold text-highlighted">
              {{ formatCurrency(lineTotal(item)) }}
            </p>
          </div>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            aria-label="Eliminar concepto"
            @click="removeItem(index)"
          />
        </div>
      </div>
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
