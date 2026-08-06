<script setup lang="ts">
import type { CustomerListItem, WorkshopType } from '~/types/crm'

defineProps<{
  customers: CustomerListItem[]
  loading?: boolean
  canEdit?: boolean
  canAssignWorkshops?: boolean
}>()

const emit = defineEmits<{
  edit: [customer: CustomerListItem]
  assignWorkshops: [customer: CustomerListItem]
}>()

const workshopIcons: Record<WorkshopType, string> = {
  BODY_SHOP: 'i-lucide-paintbrush',
  MECHANICAL: 'i-lucide-wrench',
  PAINT_STORE: 'i-lucide-palette'
}
</script>

<template>
  <div v-if="loading" class="space-y-3" aria-label="Cargando clientes">
    <UCard v-for="index in 3" :key="index">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 space-y-2">
            <USkeleton class="h-5 w-2/3" />
            <USkeleton class="h-3 w-1/3" />
          </div>
          <USkeleton class="size-8" />
        </div>
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-8 w-full" />
      </div>
    </UCard>
  </div>

  <div v-else-if="customers.length" class="space-y-3">
    <UCard
      v-for="customer in customers"
      :key="customer.id"
      :ui="{ body: 'p-4 sm:p-4' }"
    >
      <article :aria-labelledby="`customer-${customer.id}`">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <NuxtLink
              :id="`customer-${customer.id}`"
              :to="`/clientes/${customer.id}`"
              class="font-semibold text-primary hover:underline"
            >
              {{ customer.fullName }}
            </NuxtLink>
            <p v-if="customer.taxId" class="mt-0.5 text-xs text-muted">
              RFC: {{ customer.taxId }}
            </p>
          </div>

          <UButton
            icon="i-lucide-pencil"
            label="Editar"
            color="neutral"
            variant="ghost"
            :disabled="!canEdit"
            :aria-label="`Editar a ${customer.fullName}`"
            @click="emit('edit', customer)"
          />
        </div>

        <div class="mt-4 flex items-center justify-between gap-3 border-t border-muted pt-3">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              :to="{ path: '/vehiculos', query: { customer: customer.id } }"
              :aria-label="`Ver ${customer.vehiclesCount} vehículos de ${customer.fullName}`"
              class="inline-flex rounded-md"
            >
              <UBadge
                :label="`${customer.vehiclesCount} vehículos`"
                icon="i-lucide-car-front"
                color="neutral"
                variant="subtle"
              />
            </NuxtLink>
            <NuxtLink
              :to="{ path: '/ordenes', query: { customer: customer.id } }"
              :aria-label="`Ver ${customer.ordersCount} órdenes de ${customer.fullName}`"
              class="inline-flex rounded-md"
            >
              <UBadge
                :label="`${customer.ordersCount} órdenes`"
                icon="i-lucide-clipboard-list"
                color="primary"
                variant="subtle"
              />
            </NuxtLink>
          </div>

          <UButton
            v-if="canAssignWorkshops"
            color="neutral"
            variant="ghost"
            class="shrink-0"
            :aria-label="`Editar talleres de ${customer.fullName}`"
            @click="emit('assignWorkshops', customer)"
          >
            <span class="flex items-center gap-1.5">
              <UIcon
                v-for="workshop in customer.workshops"
                :key="workshop.id"
                :name="workshopIcons[workshop.type]"
                class="size-4"
              />
            </span>
          </UButton>
          <div
            v-else
            class="flex shrink-0 items-center gap-1.5"
            :aria-label="`Talleres asignados a ${customer.fullName}`"
          >
            <UIcon
              v-for="workshop in customer.workshops"
              :key="workshop.id"
              :name="workshopIcons[workshop.type]"
              class="size-4"
            />
          </div>
        </div>
      </article>
    </UCard>
  </div>

  <UCard v-else>
    <div class="py-8 text-center">
      <UIcon name="i-lucide-users" class="mx-auto size-9 text-dimmed" />
      <p class="mt-3 font-medium text-highlighted">
        No hay clientes
      </p>
      <p class="text-sm text-muted">
        Registra el primero para comenzar.
      </p>
    </div>
  </UCard>
</template>
