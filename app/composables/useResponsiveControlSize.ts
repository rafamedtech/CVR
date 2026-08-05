import { useMediaQuery } from '@vueuse/core'

export function useMobileViewport() {
  return useMediaQuery('(max-width: 767px)')
}

export function useResponsiveControlSize() {
  const isMobile = useMobileViewport()
  return computed(() => isMobile.value ? 'lg' as const : undefined)
}
