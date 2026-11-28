<script setup lang="ts">
import type { FreightDetail, FreightStatus } from '~/types/crm'

const props = defineProps<{
  freight: FreightDetail
  status: FreightStatus | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ updated: [] }>()
const toast = useToast()
const loading = shallowRef(false)
const error = shallowRef('')
const occurredAt = shallowRef('')
const deliveryTicketRef = shallowRef('')
const reason = shallowRef('')

const copy: Record<Exclude<FreightStatus, 'SCHEDULED'>, { title: string, description: string, confirm: string, icon: string, dateLabel: string }> = {
  IN_TRANSIT: {
    title: 'Registrar salida',
    description: 'Marca el flete en tránsito con la hora en que salió la unidad.',
    confirm: 'Marcar en tránsito',
    icon: 'i-lucide-truck',
    dateLabel: 'Salida'
  },
  DELIVERED: {
    title: 'Confirmar entrega',
    description: 'Confirma la descarga en destino. La entrega queda registrada con tu usuario.',
    confirm: 'Confirmar entrega',
    icon: 'i-lucide-package-check',
    dateLabel: 'Entrega'
  },
  CANCELLED: {
    title: 'Cancelar flete',
    description: 'El flete cancelado ya no podrá cambiar de estado.',
    confirm: 'Cancelar flete',
    icon: 'i-lucide-ban',
    dateLabel: 'Cancelación'
  }
}
const current = computed(() => props.status && props.status !== 'SCHEDULED' ? copy[props.status] : null)
const reasonRequired = computed(() => props.status === 'CANCELLED')
const canConfirm = computed(() => Boolean(occurredAt.value) && (!reasonRequired.value || reason.value.trim().length >= 3))

function localNow() {
  const now = new Date()
  now.setSeconds(0, 0)
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

watch(open, (isOpen) => {
  if (!isOpen) return
  error.value = ''
  occurredAt.value = localNow()
  deliveryTicketRef.value = props.freight.deliveryTicketRef ?? ''
  reason.value = ''
})

async function confirm() {
  if (!props.status || loading.value || !canConfirm.value) return
  loading.value = true
  error.value = ''
  try {
    await $fetch(`/api/freights/${props.freight.id}/status`, {
      method: 'POST',
      body: {
        status: props.status,
        // El navegador interpreta la hora local; el servidor recibe el instante con desfase.
        occurredAt: new Date(occurredAt.value).toISOString(),
        deliveryTicketRef: props.status === 'DELIVERED' ? deliveryTicketRef.value.trim() || null : null,
        reason: reason.value.trim() || null
      }
    })
    toast.add({ title: `Flete ${freightStatusLabels[props.status].toLocaleLowerCase('es-MX')}`, color: 'success', icon: 'i-lucide-check' })
    open.value = false
    emit('updated')
  } catch (caught) {
    error.value = getApiErrorMessage(caught) || 'No se pudo cambiar el estado.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="current?.title"
    :description="current?.description"
    :close="{ disabled: loading }"
    :dismissible="!loading"
    :ui="{ content: 'max-w-lg', title: 'text-lg font-semibold text-primary', footer: 'justify-end gap-2' }"
  >
    <template #body>
      <div v-if="current" class="space-y-4">
        <p class="text-sm text-muted">
          {{ freight.freightNumber }} · {{ freight.origin }} → {{ freight.destination }}
        </p>
        <UFormField :label="`Fecha y hora de ${current.dateLabel.toLocaleLowerCase('es-MX')}`" required>
          <UInput
            v-model="occurredAt"
            type="datetime-local"
            :max="localNow()"
            class="w-full"
          />
        </UFormField>
        <UFormField v-if="status === 'DELIVERED'" label="Boleta de descarga" hint="Opcional">
          <UInput v-model="deliveryTicketRef" placeholder="Número o referencia de la boleta" class="w-full" />
        </UFormField>
        <UFormField label="Motivo" :required="reasonRequired" :hint="reasonRequired ? undefined : 'Opcional'">
          <UTextarea
            v-model="reason"
            :rows="2"
            autoresize
            :maxlength="500"
            class="w-full"
          />
        </UFormField>
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="error"
        />
      </div>
    </template>
    <template #footer>
      <AppButton
        label="Volver"
        intent="secondary"
        :disabled="loading"
        @click="open = false"
      />
      <AppButton
        :label="current?.confirm"
        :icon="current?.icon"
        :intent="status === 'CANCELLED' ? 'danger' : undefined"
        :loading="loading"
        :disabled="!canConfirm"
        @click="confirm"
      />
    </template>
  </UModal>
</template>
