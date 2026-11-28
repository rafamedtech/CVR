<script setup lang="ts">
import type { ExpenseFreightOption, ExpenseOrderOption } from '~/types/crm'

withDefaults(defineProps<{
  order: ExpenseOrderOption | null
  freight?: ExpenseFreightOption | null
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
    <template v-else-if="freight">
      <p v-if="!showDetails" class="text-xs text-muted">
        Flete
      </p>
      <NuxtLink :to="`/fletes/${freight.id}`" class="font-medium text-primary hover:underline">
        {{ freight.freightNumber }}
      </NuxtLink>
      <p v-if="showDetails" class="text-xs text-muted">
        {{ freight.customerName }} · {{ freight.routeLabel }}
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
