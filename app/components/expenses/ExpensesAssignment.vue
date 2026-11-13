<script setup lang="ts">
import type { ExpenseOrderOption } from '~/types/crm'

withDefaults(defineProps<{
  order: ExpenseOrderOption | null
  global?: boolean
  showDetails?: boolean
  label?: string
}>(), { showDetails: true })
</script>

<template>
  <div class="whitespace-normal">
    <p v-if="label || (order && !showDetails)" class="text-xs text-muted">
      {{ label ?? 'Orden de trabajo' }}
    </p>
    <template v-if="order">
      <NuxtLink :to="`/ordenes/${order.id}`" class="font-medium text-primary hover:underline">
        {{ order.orderNumber }}
      </NuxtLink>
      <p v-if="showDetails" class="text-xs text-muted">
        {{ order.customerName }} · {{ order.vehicleLabel }}
      </p>
    </template>
    <UBadge
      v-else
      :label="global ? 'Gasto global' : 'Gasto del taller'"
      :icon="global ? 'i-lucide-globe' : 'i-lucide-building-2'"
      color="neutral"
      variant="subtle"
    />
  </div>
</template>
