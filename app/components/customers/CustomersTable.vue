<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CustomerListItem } from '~/types/crm'
import { formatPhone } from '~/utils/crm'

defineProps<{
  customers: CustomerListItem[]
  loading?: boolean
  showWorkshop?: boolean
}>()

const columns: TableColumn<CustomerListItem>[] = [{
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
  accessorKey: 'workshopName',
  header: 'Taller'
}, {
  id: 'actions'
}]
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <UTable :data="customers" :columns="columns" :loading="loading">
      <template #fullName-cell="{ row }">
        <div>
          <p class="font-medium text-highlighted">
            {{ row.original.fullName }}
          </p>
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
        <UBadge :label="String(row.original.vehiclesCount)" color="neutral" variant="subtle" />
      </template>

      <template #ordersCount-cell="{ row }">
        <UBadge :label="String(row.original.ordersCount)" color="primary" variant="subtle" />
      </template>

      <template #workshopName-cell="{ row }">
        <span v-if="showWorkshop" class="text-sm text-muted">{{ row.original.workshopName }}</span>
        <span v-else>—</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UButton
            :to="{ path: '/vehicles', query: { customer: row.original.id } }"
            label="Ver vehículos"
            icon="i-lucide-car-front"
            color="neutral"
            variant="ghost"
            size="sm"
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
