import assert from 'node:assert/strict'
import test from 'node:test'
import { formatCalendarRange, formatDateOnly } from '../shared/date'
import { formatDateRange, formatWorkshopDate } from '../app/utils/datetime'

test('conserva el día de una fecha de calendario almacenada en UTC', () => {
  assert.equal(formatDateOnly('2026-08-15T00:00:00.000Z'), '15 ago 2026')
})

test('conserva el día cuando recibe una fecha sin hora', () => {
  assert.equal(formatDateOnly('2026-08-15'), '15 ago 2026')
})

test('muestra un guión cuando no hay fecha', () => {
  assert.equal(formatDateOnly(null), '—')
})

test('respeta la zona del taller en timestamps y conserva el día de calendario', () => {
  const instant = '2026-01-01T06:05:00Z'
  assert.equal(formatWorkshopDate(instant, false, 'America/Tijuana'), '31 dic 2025')
  assert.equal(formatWorkshopDate(instant, false, 'America/Mexico_City'), '1 ene 2026')
  assert.equal(formatWorkshopDate('2024-02-29', true, 'America/Tijuana'), '29 feb 2024')
})

test('muestra una vez los rangos de un día en filtros y reportes', () => {
  assert.equal(formatCalendarRange('2024-02-29', '2024-02-29'), '29 feb 2024')
  assert.equal(formatDateRange('2024-02-29', '2024-02-29'), '29 feb')
})
