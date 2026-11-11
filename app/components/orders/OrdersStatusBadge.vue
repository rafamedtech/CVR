<script setup lang="ts">
import type { OrderStatus } from '~/types/crm'

defineProps<{ status: OrderStatus }>()
const appConfig = useAppConfig()
const isMobileViewport = useMobileViewport()
</script>

<template>
  <UBadge
    :label="orderStatusLabels[status]"
    :color="orderStatusColors[status]"
    variant="subtle"
    :size="isMobileViewport ? appConfig.orderStatusBadge.mobileSize : appConfig.orderStatusBadge.size"
  />
</template>
