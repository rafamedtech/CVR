<script setup lang="ts">
import type { ExpenseOrderOption } from '~/types/crm'

defineProps<{ order: ExpenseOrderOption }>()
</script>

<template>
  <UPopover arrow :content="{ align: 'end', collisionPadding: 12 }">
    <UButton
      :label="order.orderNumber"
      icon="i-lucide-clipboard-list"
      variant="link"
      size="sm"
      class="p-0"
      :aria-label="`Ver información de la orden ${order.orderNumber}`"
    />

    <template #content>
      <div class="w-72 max-w-[calc(100vw-2rem)] p-4">
        <div class="flex items-center justify-between gap-3 border-b border-default pb-3">
          <p class="flex items-center gap-2 text-sm font-semibold text-primary">
            <UIcon name="i-lucide-clipboard-list" class="size-4 shrink-0" aria-hidden="true" />
            Información de la orden
          </p>
          <UButton
            :to="`/ordenes/${order.id}`"
            icon="i-lucide-arrow-up-right"
            color="primary"
            variant="soft"
            size="sm"
            :aria-label="`Abrir orden ${order.orderNumber}`"
          />
        </div>
        <dl class="mt-3 space-y-3">
          <div>
            <dt class="text-xs text-muted">
              Cliente
            </dt>
            <dd class="mt-1 text-sm font-medium break-words text-default">
              {{ order.customerName }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">
              Vehículo
            </dt>
            <dd class="mt-1 text-sm break-words text-default">
              {{ order.vehicleLabel }}
            </dd>
          </div>
        </dl>
      </div>
    </template>
  </UPopover>
</template>
