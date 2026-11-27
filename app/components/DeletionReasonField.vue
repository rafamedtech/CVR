<script setup lang="ts">
import { DELETION_REASON_MAX, DELETION_REASON_MIN } from '#shared/audit'

withDefaults(defineProps<{ disabled?: boolean, required?: boolean }>(), { required: true })
const reason = defineModel<string>({ required: true })
</script>

<template>
  <UFormField
    :label="required ? 'Motivo' : 'Motivo (opcional)'"
    :required="required"
    :help="required ? `Mínimo ${DELETION_REASON_MIN} caracteres. Queda en el historial de cambios con tu usuario y la fecha.` : 'Queda en el historial de cambios con tu usuario y la fecha.'"
  >
    <UTextarea
      v-model="reason"
      :maxlength="DELETION_REASON_MAX"
      :disabled="disabled"
      :rows="2"
      autoresize
      placeholder="Ej. Pago capturado dos veces"
      class="w-full"
    />
  </UFormField>
</template>
