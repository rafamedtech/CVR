import { useMediaQuery } from '@vueuse/core'

export function useMobileViewport() {
  return useMediaQuery('(max-width: 767px)')
}
