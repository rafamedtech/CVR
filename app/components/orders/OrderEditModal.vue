<script setup lang="ts">
import { z } from 'zod'
import { parseDate, type CalendarDate } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { OrderDetail, OrderPriority } from '~/types/crm'

const props = defineProps<{
  order: OrderDetail | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  updated: []
}>()

const toast = useToast()
const loading = shallowRef(false)
const unassignedMemberValue = '__unassigned__'
const schema = z.object({
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']),
  complaint: z.string().min(3, 'Describe el servicio solicitado.'),
  diagnosis: z.string().optional(),
  intakeNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  promisedAt: z.string().optional(),
  assignedToId: z.string().optional()
})
type OrderEditSchema = z.output<typeof schema>

const state = reactive<{
  priority: OrderPriority
  complaint: string
  diagnosis: string
  intakeNotes: string
  internalNotes: string
  promisedAt: string
  assignedToId: string
}>({
  priority: 'NORMAL',
  complaint: '',
  diagnosis: '',
  intakeNotes: '',
  internalNotes: '',
  promisedAt: '',
  assignedToId: unassignedMemberValue
})

const priorityOptions = Object.entries(orderPriorityLabels).map(([value, label]) => ({ value, label }))
const promisedDate = shallowRef<CalendarDate | undefined>()
const promisedDateOpen = ref(false)
const memberOptions = computed(() => [
  { label: 'Sin asignar', value: unassignedMemberValue },
  ...(props.order?.availableAssignees ?? []).map(member => ({
    label: `${member.fullName} · ${workshopRoleLabels[member.role]}`,
    value: member.id
  }))
])

function toLocalDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatPromisedDate(date: CalendarDate | undefined) {
  if (!date) return 'Selecciona una fecha'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium'
  }).format(date.toDate('UTC'))
}

watch([open, () => props.order], ([isOpen, order]) => {
  if (!isOpen || !order) return

  Object.assign(state, {
    priority: order.priority,
    complaint: order.complaint,
    diagnosis: order.diagnosis ?? '',
    intakeNotes: order.intakeNotes ?? '',
    internalNotes: order.internalNotes ?? '',
    promisedAt: toLocalDate(order.promisedAt),
    assignedToId: order.assignedToId ?? unassignedMemberValue
  })

  promisedDate.value = state.promisedAt ? parseDate(state.promisedAt) : undefined
}, { immediate: true })

watch(promisedDate, (date) => {
  state.promisedAt = date ? `${date.toString()}T12:00:00` : ''
})

async function onSubmit(event: FormSubmitEvent<OrderEditSchema>) {
  if (!props.order) return

  loading.value = true
  try {
    await $fetch(`/api/orders/${props.order.id}`, {
      method: 'PATCH',
      body: {
        ...event.data,
        promisedAt: event.data.promisedAt || null,
        assignedToId: event.data.assignedToId === unassignedMemberValue ? '' : event.data.assignedToId
      }
    })
    toast.add({ title: 'Orden actualizada', color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('updated')
  } catch (error) {
    toast.add({
      title: 'No se pudo actualizar la orden',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Editar orden"
    description="Actualiza el seguimiento, la recepción y la asignación de esta orden."
    :ui="{ content: 'sm:max-w-4xl', body: 'max-h-[72vh] overflow-y-auto', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="order-edit-form"
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <UFormField name="promisedAt" label="Entrega prometida">
            <UPopover v-model:open="promisedDateOpen">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar-days"
                :label="formatPromisedDate(promisedDate)"
                class="w-full justify-start font-normal"
              />

              <template #content>
                <UCalendar
                  v-model="promisedDate"
                  locale="es-MX"
                  @update:model-value="promisedDateOpen = false"
                />
              </template>
            </UPopover>
          </UFormField>
          <UFormField name="priority" label="Prioridad">
            <USelect
              v-model="state.priority"
              :items="priorityOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField name="assignedToId" label="Responsable">
            <USelect
              v-model="state.assignedToId"
              :items="memberOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="complaint"
            label="Servicio solicitado"
            required
            class="sm:col-span-2 lg:col-span-3"
          >
            <UTextarea
              v-model="state.complaint"
              class="w-full"
              :rows="3"
              autoresize
            />
          </UFormField>
          <UFormField name="diagnosis" label="Diagnóstico" class="sm:col-span-2 lg:col-span-3">
            <UTextarea
              v-model="state.diagnosis"
              class="w-full"
              :rows="3"
              autoresize
            />
          </UFormField>
          <UFormField name="intakeNotes" label="Daños previos / recepción" class="sm:col-span-2 lg:col-span-3">
            <UTextarea
              v-model="state.intakeNotes"
              class="w-full"
              :rows="2"
              autoresize
            />
          </UFormField>
          <UFormField name="internalNotes" label="Notas internas" class="sm:col-span-2 lg:col-span-3">
            <UTextarea
              v-model="state.internalNotes"
              class="w-full"
              :rows="2"
              autoresize
            />
          </UFormField>
        </div>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Cancelar"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        type="submit"
        form="order-edit-form"
        label="Guardar cambios"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
