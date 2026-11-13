import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import type { CrmRequestContext } from '../server/utils/auth'

const source = ts.transpileModule(
  readFileSync(new URL('../server/utils/expenses.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText
const exports: {
  expenseAccessWhere: (context: CrmRequestContext) => unknown
  resolveExpenseWorkshopId: (context: CrmRequestContext, assignment: string) => string | null
} = {} as never
runInNewContext(source, {
  exports,
  requireSuperAdmin: (context: CrmRequestContext) => {
    if (!context.isSuperAdmin || context.isReadOnly) throw new Error('Forbidden')
  },
  requireGlobalReadAccess: (context: CrmRequestContext) => {
    if (!context.isSuperAdmin && !context.isReadOnly) throw new Error('Forbidden')
  },
  requireWorkshopRole: (context: CrmRequestContext) => {
    if (context.isReadOnly) throw new Error('Forbidden')
  },
  requireSelectedWorkshop: (context: CrmRequestContext) => {
    if (!context.workshopId) throw new Error('Select workshop')
    return context.workshopId
  }
})
const context = (overrides: Partial<CrmRequestContext> = {}) => ({
  workshopId: 'workshop-1', isSuperAdmin: false, isReadOnly: false, ...overrides
}) as CrmRequestContext
const plain = (value: unknown) => JSON.parse(JSON.stringify(value))

test('local users only query expenses assigned to their workshop', () => {
  assert.deepEqual(plain(exports.expenseAccessWhere(context())), { workshopId: 'workshop-1' })
  assert.throws(() => exports.expenseAccessWhere(context({ workshopId: null })))
})

test('global readers see global expenses alongside the selected workshop', () => {
  for (const role of [{ isSuperAdmin: true }, { isReadOnly: true }]) {
    assert.deepEqual(plain(exports.expenseAccessWhere(context(role))), {
      OR: [{ workshopId: 'workshop-1' }, { workshopId: null }]
    })
    assert.deepEqual(plain(exports.expenseAccessWhere(context({ ...role, workshopId: null }))), {})
  }
})

test('only general administrators can record global expenses, with or without a selection', () => {
  for (const workshopId of [null, 'workshop-1']) {
    assert.equal(exports.resolveExpenseWorkshopId(context({ workshopId, isSuperAdmin: true }), 'GLOBAL'), null)
    assert.throws(() => exports.resolveExpenseWorkshopId(context({ workshopId }), 'GLOBAL'))
    assert.throws(() => exports.resolveExpenseWorkshopId(context({ workshopId, isReadOnly: true }), 'GLOBAL'))
  }
})

test('workshop expenses still require a selected workshop and write access', () => {
  assert.equal(exports.resolveExpenseWorkshopId(context(), 'WORKSHOP'), 'workshop-1')
  assert.equal(exports.resolveExpenseWorkshopId(context(), 'ORDER'), 'workshop-1')
  assert.throws(() => exports.resolveExpenseWorkshopId(context({ workshopId: null, isSuperAdmin: true }), 'WORKSHOP'))
  assert.throws(() => exports.resolveExpenseWorkshopId(context({ isReadOnly: true }), 'ORDER'))
})
