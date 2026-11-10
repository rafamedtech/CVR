// Inclusive ranges match PostgREST's range(from, to). Do not rely on nested
// relationship defaults or the server's 1,000-row response limit.
export async function readReportPages<T>(page: (from: number, to: number) => PromiseLike<{
  data: T[] | null
  error: { message: string } | null
}>, pageSize = 500): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new Error('El tamaño de página no es válido.')
  const result: T[] = []
  for (let from = 0; ; from += pageSize) {
    const response = await page(from, from + pageSize - 1)
    if (response.error) throw new Error('No se pudo leer una página de Carolina Pinturas.')
    if (!response.data) throw new Error('Carolina Pinturas no devolvió datos de reporte.')
    result.push(...response.data)
    if (response.data.length < pageSize) return result
  }
}
