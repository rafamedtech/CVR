<script setup lang="ts">
import type { VehicleDetail } from "~/types/crm";
import { formatCurrency, formatDate, formatPhone } from "~/utils/crm";

const props = defineProps<{
  vehicle: VehicleDetail;
  showWorkshopBadge?: boolean;
}>();

const workshopBadgeLabel = computed(() =>
  props.vehicle.workshops.map((workshop) => workshop.name).join(", "),
);
const orderTotals = computed(() =>
  props.vehicle.orders.reduce(
    (totals, order) => ({
      total: totals.total + order.total,
      paid: totals.paid + order.paid,
      balance: totals.balance + order.balance,
    }),
    { total: 0, paid: 0, balance: 0 },
  ),
);
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <UIcon name="i-lucide-car-front" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-highlighted">
              Información del vehículo
            </h2>
            <p class="mt-1 text-sm text-muted">
              Registrado el {{ formatDate(vehicle.createdAt) }}
            </p>
          </div>
          <UBadge
            v-if="showWorkshopBadge && workshopBadgeLabel"
            :label="workshopBadgeLabel"
            color="primary"
            variant="subtle"
            class="shrink-0"
          />
        </div>
      </template>

      <dl class="grid gap-5 sm:grid-cols-2">
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Vehículo
          </dt>
          <dd class="mt-1.5 text-default">
            {{ vehicle.make }} {{ vehicle.model }} {{ vehicle.year }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Placas
          </dt>
          <dd class="mt-1.5 text-default">
            {{ vehicle.licensePlate || "Sin placas" }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            VIN / número de serie
          </dt>
          <dd class="mt-1.5 break-all font-mono text-sm text-default">
            {{ vehicle.vin || "No registrado" }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Color
          </dt>
          <dd class="mt-1.5 text-default">
            {{ vehicle.color || "No registrado" }}
          </dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Propietario
          </dt>
          <dd class="mt-1.5">
            <NuxtLink
              :to="`/clientes/${vehicle.customer.id}`"
              class="font-medium text-primary hover:underline"
            >
              {{ vehicle.customer.fullName }}
            </NuxtLink>
            <p class="mt-1 text-sm text-muted">
              {{ formatPhone(vehicle.customer.phone)
              }}<span v-if="vehicle.customer.email">
                · {{ vehicle.customer.email }}</span
              >
            </p>
          </dd>
        </div>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <UIcon name="i-lucide-chart-column" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-highlighted">Resumen</h2>
            <p class="mt-1 text-sm text-muted">
              Actividad y saldo del vehículo.
            </p>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-lg bg-elevated/60 p-4">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-clipboard-list" class="size-4" />
            <span class="text-sm">Órdenes de trabajo</span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ vehicle.ordersCount }}
          </p>
        </div>
        <div class="rounded-lg bg-elevated/60 p-4">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-receipt-text" class="size-4" />
            <span class="text-sm">Total de órdenes</span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ formatCurrency(orderTotals.total) }}
          </p>
        </div>
        <div class="rounded-lg bg-elevated/60 p-4">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-circle-dollar-sign" class="size-4" />
            <span class="text-sm">Cobrado</span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-success">
            {{ formatCurrency(orderTotals.paid) }}
          </p>
        </div>
        <div class="rounded-lg bg-elevated/60 p-4">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-hand-coins" class="size-4" />
            <span class="text-sm">Saldo pendiente</span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-warning">
            {{ formatCurrency(orderTotals.balance) }}
          </p>
        </div>
      </div>

      <div v-if="vehicle.notes" class="mt-6 border-t border-default pt-5">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">
          Daños previos y observaciones
        </p>
        <p class="mt-2 whitespace-pre-wrap text-sm text-default">
          {{ vehicle.notes }}
        </p>
      </div>
    </UCard>
  </div>
</template>
