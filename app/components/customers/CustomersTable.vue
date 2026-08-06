<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CustomerListItem, WorkshopType } from '~/types/crm'
import { formatPhone } from '~/utils/crm'
import CustomerMobileList from './CustomersMobileList.vue'

const props = defineProps<{
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

const page = shallowRef(1)
const pageSize = 10
const customerIds = computed(() => props.customers.map(customer => customer.id).join(','))
const paginatedCustomers = computed(() => {
  const start = (page.value - 1) * pageSize
  return props.customers.slice(start, start + pageSize)
})
const visibleRange = computed(() => {
  if (!props.customers.length) return null

  const start = (page.value - 1) * pageSize + 1
  return {
    start,
    end: Math.min(start + pageSize - 1, props.customers.length)
  }
})

watch(customerIds, () => {
  page.value = 1
})

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

  return [
    ...baseColumns.slice(0, -1),
    {
      id: 'workshops',
      header: 'Taller'
    },
    baseColumns.at(-1)!
  ]
})
</script>

<template>
  <div>
    <CustomerMobileList
      class="md:hidden"
      :customers="paginatedCustomers"
      :loading="loading"
      :can-edit="canEdit"
      :can-assign-workshops="canAssignWorkshops"
      @edit="emit('edit', $event)"
      @assign-workshops="emit('assignWorkshops', $event)"
    />

    <UCard class="hidden md:block" :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="paginatedCustomers" :columns="columns" :loading="loading">
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
            :to="{ path: '/vehiculos', query: { customer: row.original.id } }"
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
            :to="{ path: '/ordenes', query: { customer: row.original.id } }"
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

        <template #workshops-cell="{ row }">
          <UButton
            v-if="canAssignWorkshops"
            color="neutral"
            variant="ghost"
            class="w-14 justify-center"
            :aria-label="`Editar talleres de ${row.original.fullName}`"
            @click="emit('assignWorkshops', row.original)"
          >
            <UIcon
              v-for="workshop in row.original.workshops"
              :key="workshop.id"
              :name="workshopIcons[workshop.type]"
              class="size-4"
            />
          </UButton>
          <div
            v-else
            class="flex items-center gap-1"
            :aria-label="`Talleres asignados a ${row.original.fullName}`"
          >
            <UIcon
              v-for="workshop in row.original.workshops"
              :key="workshop.id"
              :name="workshopIcons[workshop.type]"
              class="size-4"
            />
          </div>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              label="Editar"
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
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

    <div
      v-if="!loading && customers.length > pageSize"
      class="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p v-if="visibleRange" class="text-sm text-muted" aria-live="polite">
        Mostrando {{ visibleRange.start }}–{{ visibleRange.end }} de {{ customers.length }} clientes
      </p>
      <UPagination
        v-model:page="page"
        :total="customers.length"
        :items-per-page="pageSize"
        aria-label="Paginación de clientes"
      />
    </div>
  </div>
</template>
