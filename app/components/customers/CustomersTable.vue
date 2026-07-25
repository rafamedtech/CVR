<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CustomerListItem } from '~/types/crm'
import { formatPhone } from '~/utils/crm'

const props = defineProps<{
  customers: CustomerListItem[]
  loading?: boolean
  showWorkshop?: boolean
  canEdit?: boolean
}>()
const emit = defineEmits<{
  edit: [customer: CustomerListItem]
}>()

const columns = computed<TableColumn<CustomerListItem>[]>(() => {
  const baseColumns: TableColumn<CustomerListItem>[] = [{
    accessorKey: 'fullName',
    header: 'Cliente'
  }, {
    accessorKey: 'phone',
    header: 'Contacto'
  }, {
    accessorKey: 'vehiclesCount',
    header: 'Vehículos'
  }, {
    accessorKey: 'ordersCount',
    header: 'Órdenes'
  }, {
    id: 'actions'
  }]

  if (!props.showWorkshop) return baseColumns

  return [
    ...baseColumns.slice(0, -1),
    {
      accessorKey: 'workshopName',
      header: 'Taller'
    },
    baseColumns.at(-1)!
  ]
})
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <UTable :data="customers" :columns="columns" :loading="loading">
      <template #fullName-cell="{ row }">
        <div>
          <NuxtLink
            :to="`/clientes/${row.original.id}`"
            class="font-medium text-primary hover:underline"
          >
            {{ row.original.fullName }}
          </NuxtLink>
          <p v-if="row.original.taxId" class="text-xs text-muted">
            RFC: {{ row.original.taxId }}
          </p>
        </div>
      </template>

      <template #phone-cell="{ row }">
        <div>
          <p class="text-default">
            {{ formatPhone(row.original.phone) }}
          </p>
          <p class="text-xs text-muted">
            {{ row.original.email || 'Sin correo registrado' }}
          </p>
        </div>
      </template>

      <template #vehiclesCount-cell="{ row }">
        <NuxtLink
          :to="{ path: '/vehicles', query: { customer: row.original.id } }"
          :aria-label="`Ver vehículos de ${row.original.fullName}`"
          class="inline-flex rounded-md"
        >
          <UBadge
            :label="String(row.original.vehiclesCount)"
            color="neutral"
            variant="subtle"
            class="cursor-pointer transition-opacity hover:opacity-80"
          />
        </NuxtLink>
      </template>

      <template #ordersCount-cell="{ row }">
        <NuxtLink
          :to="{ path: '/orders', query: { customer: row.original.id } }"
          :aria-label="`Ver órdenes de ${row.original.fullName}`"
          class="inline-flex rounded-md"
        >
          <UBadge
            :label="String(row.original.ordersCount)"
            color="primary"
            variant="subtle"
            class="cursor-pointer transition-opacity hover:opacity-80"
          />
        </NuxtLink>
      </template>

      <template #workshopName-cell="{ row }">
        <span class="text-sm text-muted">{{ row.original.workshopName }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UButton
            label="Editar"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="!canEdit"
            @click="emit('edit', row.original)"
          />
        </div>
      </template>

      <template #empty>
        <div class="py-12 text-center">
          <UIcon name="i-lucide-users" class="mx-auto size-9 text-dimmed" />
          <p class="mt-3 font-medium text-highlighted">
            No hay clientes
          </p>
          <p class="text-sm text-muted">
            Registra el primero para comenzar.
          </p>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
