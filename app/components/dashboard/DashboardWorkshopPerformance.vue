<script setup lang="ts">
import type { DashboardData } from '~/types/crm'

defineProps<{
  workshops: DashboardData['workshops']
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h2 class="font-semibold text-highlighted">
          Comparativo de negocios
        </h2>
        <p class="text-sm text-muted">
          Resultados separados por taller
        </p>
      </div>
    </template>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="workshop in workshops"
        :key="workshop.id"
        class="rounded-xl border border-default bg-elevated/30 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 class="font-medium text-highlighted">
            {{ workshop.name }}
          </h3>
          <UBadge :label="`${workshop.openOrders} abiertas`" color="neutral" variant="subtle" />
        </div>
        <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-muted">
              Ventas
            </dt>
            <dd class="mt-1 font-semibold text-highlighted">
              {{ formatCurrency(workshop.sales) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              Cobrado
            </dt>
            <dd class="mt-1 font-semibold text-success">
              {{ formatCurrency(workshop.collected) }}
            </dd>
          </div>
          <div class="col-span-2">
            <dt class="text-muted">
              Gastos
            </dt>
            <dd class="mt-1 font-semibold text-warning">
              {{ formatCurrency(workshop.expenses) }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </UCard>
</template>
