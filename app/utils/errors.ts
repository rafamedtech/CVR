export function getApiErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const candidate = error as {
      data?: { statusMessage?: string, message?: string }
      statusMessage?: string
      message?: string
    }
    return candidate.data?.statusMessage
      ?? candidate.data?.message
      ?? candidate.statusMessage
      ?? candidate.message
      ?? 'Ocurrió un error inesperado.'
  }

  return 'Ocurrió un error inesperado.'
}
