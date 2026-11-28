<script setup lang="ts">
import { formatDateOnly } from '#shared/date'
import { freightMutationSchema, type FreightMutation } from '#shared/freight'
import { parseDate, today, type DateValue } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Currency, CustomerListItem, FreightDetail, FreightSource } from '~/types/crm'
import { DEFAULT_WORKSHOP_TIME_ZONE } from '~/utils/datetime'
import { currencyOptions } from '~/utils/crm'

const props = defineProps<{
  customers?: CustomerListItem[]
  freight?: FreightDetail | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [id: string], updated: [] }>()
const toast = useToast()
const { activeWorkshop, workshopTimeZone } = useCrmSession()
const loading = shallowRef(false)
const timeZone = computed(() => workshopTimeZone(activeWorkshop.value?.id) ?? DEFAULT_WORKSHOP_TIME_ZONE)
const serviceDate = shallowRef<DateValue | undefined>(today(timeZone.value))
const isEditing = computed(() => Boolean(props.freight))
const sourceOptions: Array<{ label: string, value: FreightSource }> = [
  { label: freightSourceLabels.MANUAL, value: 'MANUAL' },
  { label: freightSourceLabels.NEXO, value: 'NEXO' }
]

interface FreightFormState {
  customerId: string
  source: FreightSource
  sourceRecordId: string
  sourceFolio: string
  sourceUrl: string
  serviceReference: string
  origin: string
  destination: string
  amount?: number
  currency: Currency
  exchangeRate?: number
  serviceDate: string
  deliveryTicketRef: string
  invoiceSeries: string
  invoiceFolio: string
  invoiceUuid: string
  notes: string
}

function emptyState(): FreightFormState {
  return {
    customerId: '',
    source: 'MANUAL',
    sourceRecordId: '',
    sourceFolio: '',
    sourceUrl: '',
    serviceReference: '',
    origin: '',
    destination: '',
    amount: undefined,
    currency: 'MXN',
    exchangeRate: 1,
    serviceDate: today(timeZone.value).toString(),
    deliveryTicketRef: '',
    invoiceSeries: '',
    invoiceFolio: '',
    invoiceUuid: '',
    notes: ''
  }
}

const state = reactive<FreightFormState>(emptyState())

watch(serviceDate, (date) => {
  state.serviceDate = date?.toString() ?? ''
})
// Captura directa no guarda datos de Nexo: limpiarlos evita errores de campos ocultos.
watch(() => state.source, (source) => {
  if (source !== 'MANUAL') return
  state.sourceRecordId = ''
  state.sourceFolio = ''
  state.sourceUrl = ''
})
watch(() => state.currency, (currency: Currency) => {
  if (currency === 'MXN') state.exchangeRate = 1
})

watch([open, () => props.freight], ([isOpen, freight]) => {
  if (!isOpen) return
  const next: FreightFormState = freight
    ? {
        customerId: freight.customerId,
        source: freight.source,
        sourceRecordId: freight.sourceRecordId ?? '',
        sourceFolio: freight.sourceFolio ?? '',
        sourceUrl: freight.sourceUrl ?? '',
        serviceReference: freight.serviceReference ?? '',
        origin: freight.origin,
        destination: freight.destination,
        amount: freight.amount,
        currency: freight.currency,
        exchangeRate: freight.exchangeRate,
        serviceDate: freight.serviceDate,
        deliveryTicketRef: freight.deliveryTicketRef ?? '',
        invoiceSeries: freight.invoiceSeries ?? '',
        invoiceFolio: freight.invoiceFolio ?? '',
        invoiceUuid: freight.invoiceUuid ?? '',
        notes: freight.notes ?? ''
      }
    : emptyState()
  Object.assign(state, next)
  serviceDate.value = parseDate(next.serviceDate)
}, { immediate: true })

const selectedCustomer = computed(() => props.freight
  ? { id: props.freight.customerId, fullName: props.freight.customerName }
  : null)

async function onSubmit(event: FormSubmitEvent<FreightMutation>) {
  if (loading.value) return
  loading.value = true
  try {
    if (props.freight) {
      await $fetch(`/api/freights/${props.freight.id}`, { method: 'PATCH', body: event.data })
      toast.add({ title: 'Flete actualizado', color: 'success', icon: 'i-lucide-check' })
      open.value = false
      emit('updated')
    } else {
      const created = await $fetch<{ id: string, freightNumber: string }>('/api/freights', { method: 'POST', body: event.data })
      toast.add({ title: `Flete ${created.freightNumber} registrado`, color: 'success', icon: 'i-lucide-check' })
      open.value = false
      emit('created', created.id)
    }
  } catch (error) {
    toast.add({
      title: props.freight ? 'No se pudo actualizar el flete' : 'No se pudo registrar el flete',
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
    :title="isEditing ? 'Editar flete' : 'Registrar flete'"
    :description="isEditing ? 'Actualiza los datos del servicio de transporte.' : 'Captura el servicio, su ruta, el importe y las referencias para facturar y cobrar.'"
    :close="{ disabled: loading }"
    :dismissible="false"
    :ui="{
      content: 'max-w-4xl',
      header: 'pr-12 sm:pr-14',
      title: 'text-lg font-semibold text-primary',
      body: 'p-4 sm:p-6',
      footer: 'justify-end bg-elevated/30'
    }"
  >
    <template #body>
      <UForm
        id="freight-form"
        :schema="freightMutationSchema"
        :state="state"
        class="grid items-stretch gap-4 md:grid-cols-2"
        @submit="onSubmit"
      >
        <DetailCard
          title="Servicio"
          icon="i-lucide-truck"
          :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="space-y-4">
            <UFormField name="customerId" label="Cliente" required>
              <OrdersOrderCustomerSelectMenu
                v-model="state.customerId"
                :customers="customers"
                :selected-customer="selectedCustomer"
                :disabled="loading"
              />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField name="serviceDate" label="Fecha del servicio" required>
                <CalendarDatePicker
                  v-model="serviceDate"
                  :time-zone="timeZone"
                  :format-value="date => date ? formatDateOnly(date.toString()) : 'Selecciona una fecha'"
                  placeholder="Selecciona una fecha"
                  class="w-full justify-start font-normal"
                />
              </UFormField>
              <UFormField name="serviceReference" label="Referencia" hint="Opcional">
                <UInput v-model="state.serviceReference" placeholder="Pedido o carta porte" class="w-full" />
              </UFormField>
            </div>
            <UFormField name="origin" label="Origen" required>
              <UInput v-model="state.origin" placeholder="Ciudad o planta de carga" class="w-full" />
            </UFormField>
            <UFormField name="destination" label="Destino" required>
              <UInput v-model="state.destination" placeholder="Ciudad o planta de descarga" class="w-full" />
            </UFormField>
          </div>
        </DetailCard>

        <DetailCard
          title="Origen del registro"
          icon="i-lucide-link"
          :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="space-y-4">
            <UFormField name="source" label="¿De dónde viene el viaje?" required>
              <URadioGroup
                v-model="state.source"
                :items="sourceOptions"
                value-key="value"
                orientation="horizontal"
              />
            </UFormField>
            <template v-if="state.source === 'NEXO'">
              <div class="grid grid-cols-2 gap-3">
                <UFormField name="sourceRecordId" label="ID del expediente" required>
                  <UInput v-model="state.sourceRecordId" placeholder="ID en el enlace" class="w-full" />
                </UFormField>
                <UFormField name="sourceFolio" label="Folio del viaje" hint="Opcional">
                  <UInput v-model="state.sourceFolio" placeholder="66736" class="w-full" />
                </UFormField>
              </div>
              <UFormField name="sourceUrl" label="Enlace al expediente" hint="Opcional">
                <UInput
                  v-model="state.sourceUrl"
                  type="url"
                  placeholder="https://…"
                  class="w-full"
                />
              </UFormField>
            </template>
            <p v-else class="text-sm text-muted">
              Usa «Portal Nexo» cuando el viaje venga del portal del cliente para conservar su expediente y evitar duplicados.
            </p>
          </div>
        </DetailCard>

        <DetailCard
          title="Importe"
          icon="i-lucide-wallet"
          :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="grid grid-cols-2 gap-3">
            <MoneyFormFields
              v-model:currency="state.currency"
              v-model:rate="state.exchangeRate"
              v-model:amount="state.amount"
              :currencies="currencyOptions"
              :rate-disabled="state.currency === 'MXN'"
              :rate-required="state.currency === 'USD'"
              :disabled="loading"
            />
          </div>
          <p class="text-xs text-muted">
            Importe del servicio antes de impuestos, en la moneda acordada.
          </p>
        </DetailCard>

        <DetailCard
          title="Facturación y entrega"
          icon="i-lucide-file-text"
          :ui="{ container: 'p-4 sm:p-5 gap-4', title: 'text-sm font-semibold text-primary' }"
        >
          <div class="grid grid-cols-2 gap-3">
            <UFormField name="invoiceSeries" label="Serie" hint="Opcional">
              <UInput v-model="state.invoiceSeries" placeholder="SIDE" class="w-full" />
            </UFormField>
            <UFormField name="invoiceFolio" label="Folio de factura" hint="Opcional">
              <UInput v-model="state.invoiceFolio" placeholder="17551" class="w-full" />
            </UFormField>
            <UFormField
              name="invoiceUuid"
              label="UUID fiscal"
              hint="Opcional"
              class="col-span-2"
            >
              <UInput v-model="state.invoiceUuid" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" class="w-full" />
            </UFormField>
            <UFormField
              name="deliveryTicketRef"
              label="Boleta de descarga"
              hint="Opcional"
              class="col-span-2"
            >
              <UInput v-model="state.deliveryTicketRef" placeholder="Número o referencia de la boleta" class="w-full" />
            </UFormField>
          </div>
        </DetailCard>

        <UFormField
          name="notes"
          label="Notas"
          hint="Opcional"
          class="md:col-span-2"
        >
          <UTextarea
            v-model="state.notes"
            :rows="2"
            autoresize
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <AppButton
        type="submit"
        form="freight-form"
        :label="isEditing ? 'Guardar cambios' : 'Registrar flete'"
        icon="i-lucide-check"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
