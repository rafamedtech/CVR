import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import contract from '../shared/carolina-contract.json' with { type: 'json' }

// Contrato dirigido por el consumidor: las consultas a Carolina deben usar exactamente
// las tablas, columnas y relaciones declaradas en shared/carolina-contract.json.
// Si cambias una consulta, actualiza el contrato y su copia en
// siigo-pinturas/tests/contracts/cvr-carolina.json.

type Usage = { columns: Map<string, Set<string>>, relations: Array<{ table: string, references: string, hint: string | null }> }

const FILTERS = /\.(eq|neq|gt|gte|lt|lte|in|not|is|like|ilike|order)\(\s*'([a-z_.]+)'/g

function splitTopLevel(value: string) {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of value) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function addColumn(usage: Usage, table: string, column: string) {
  if (!usage.columns.has(table)) usage.columns.set(table, new Set())
  usage.columns.get(table)!.add(column)
}

function parseSelect(select: string, table: string, usage: Usage, aliases: Map<string, string>) {
  for (const item of splitTopLevel(select)) {
    const match = item.match(/^(?:(\w+):)?(\w+)(?:!(\w+))?(?:\(([\s\S]*)\))?$/)
    assert.ok(match, `No se pudo interpretar «${item}» en la consulta a ${table}`)
    const [, alias, name, hint, inner] = match
    if (inner === undefined) {
      addColumn(usage, table, name!)
      continue
    }
    usage.relations.push({ table, references: name!, hint: hint && hint !== 'inner' ? hint : null })
    aliases.set(alias ?? name!, name!)
    parseSelect(inner, name!, usage, aliases)
  }
}

export function extractCarolinaUsage(sources: string[]): Usage {
  const usage: Usage = { columns: new Map(), relations: [] }
  for (const source of sources) {
    const chains = source.split(/\.from\(\s*'/).slice(1)
    for (const chain of chains) {
      const table = chain.slice(0, chain.indexOf('\''))
      const select = chain.match(/\.select\(\s*'([^']*)'/)?.[1]
      assert.ok(select, `La consulta a ${table} no tiene un select literal`)
      const aliases = new Map<string, string>()
      parseSelect(select, table, usage, aliases)
      const body = chain.split(/readReportPages|\n\s*\/\//)[0]!
      for (const [, , column] of body.matchAll(FILTERS)) {
        const [first, second] = column!.split('.')
        if (second) addColumn(usage, aliases.get(first!) ?? first!, second)
        else addColumn(usage, table, first!)
      }
    }
  }
  return usage
}

const sources = ['carolina-reports.ts', 'carolina-inventory.ts']
  .map(file => readFileSync(new URL(`../server/utils/${file}`, import.meta.url), 'utf8'))
const usage = extractCarolinaUsage(sources)
const sorted = (values: Iterable<string>) => [...values].sort()

test('las consultas a Carolina usan exactamente las tablas y columnas del contrato', () => {
  const used = Object.fromEntries(sorted(usage.columns.keys()).map(table => [table, sorted(usage.columns.get(table)!)]))
  const declared = Object.fromEntries(Object.entries(contract.tables).map(([table, columns]) => [table, sorted(columns)]))
  assert.deepEqual(used, declared, 'Actualiza shared/carolina-contract.json y su copia en siigo-pinturas/tests/contracts/cvr-carolina.json')
})

test('cada relación embebida está declarada en el contrato y no sobran relaciones', () => {
  for (const relation of usage.relations) {
    const found = contract.relations.some(item => item.table === relation.table
      && item.references === relation.references
      && (relation.hint === null || item.column === relation.hint))
    assert.ok(found, `Relación no declarada: ${relation.table} → ${relation.references}${relation.hint ? ` (${relation.hint})` : ''}`)
  }
  for (const item of contract.relations) {
    assert.ok(usage.relations.some(relation => relation.table === item.table && relation.references === item.references),
      `Relación declarada sin uso: ${item.table}.${item.column} → ${item.references}`)
  }
})

test('el extractor detecta columnas nuevas en select, filtros y relaciones embebidas', () => {
  const sample = extractCarolinaUsage([
    `client.from('sales_orders').select('id,folio,customer:siigo_customers!customer_id(rfc)').gte('order_date', a).not('status_key', 'in', '(x)')`,
    `client.from('sales_order_items').select('id,order:sales_orders!inner(order_date)').lte('order.created_at', b)`
  ])
  assert.deepEqual(sorted(sample.columns.get('sales_orders')!), ['created_at', 'folio', 'id', 'order_date', 'status_key'])
  assert.deepEqual(sorted(sample.columns.get('siigo_customers')!), ['rfc'])
  assert.deepEqual(sample.relations, [
    { table: 'sales_orders', references: 'siigo_customers', hint: 'customer_id' },
    { table: 'sales_order_items', references: 'sales_orders', hint: null }
  ])
})
