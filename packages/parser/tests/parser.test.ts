import { describe, it, expect, beforeAll } from 'vitest'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { compile } from '../src/pipeline/compile.js'
import { discover } from '../src/pipeline/discovery.js'
import { IrEntity } from '../src/types/ir.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, 'fixtures')

describe('Discovery', () => {
  it('finds and groups files by entity', () => {
    const groups = discover(FIXTURES)
    expect(groups).toHaveLength(1)
    expect(groups[0].module).toBe('Procurement')
    expect(groups[0].entityName).toBe('PurchaseOrder')
    expect(groups[0].files.entity).toBeDefined()
    expect(groups[0].files.flow).toBeDefined()
    expect(groups[0].files.views).toBeDefined()
  })
})

describe('Compile — PurchaseOrder', () => {
  let entity: IrEntity

  beforeAll(() => {
    const result = compile(FIXTURES)
    expect(result).toHaveLength(1)
    entity = result[0]
  })

  it('compiles without errors', () => {
    expect(entity).toBeDefined()
  })

  it('sets module and name correctly', () => {
    expect(entity.module).toBe('Procurement')
    expect(entity.name).toBe('PurchaseOrder')
    expect(entity.label).toBe('採購單')
  })

  it('desugars enum field with value/label options', () => {
    const status = entity.fields.status
    expect(status.type).toBe('enum')
    if (status.type === 'enum') {
      expect(status.options).toHaveLength(5)
      expect(status.options[0]).toEqual({ value: 'Draft', label: '草稿' })
    }
  })

  it('desugars computed field as virtual', () => {
    const net = entity.fields.netAmount
    expect(net.type).toBe('decimal')
    if (net.type !== 'lookup' && net.type !== 'enum') {
      expect(net.computed).toBe('totalAmount - discountAmount')
      expect(net.virtual).toBe(false) // IrBaseField.virtual is always false
    }
  })

  it('desugars lookup field', () => {
    const phone = entity.fields.supplierPhone
    expect(phone.type).toBe('lookup')
    if (phone.type === 'lookup') {
      expect(phone.virtual).toBe(true)
      expect(phone.relation).toBe('supplier')
      expect(phone.field).toBe('phoneNumber')
    }
  })

  it('desugars string shorthand field', () => {
    const notes = entity.fields.notes
    expect(notes.type).toBe('string')
  })

  it('desugars relations', () => {
    expect(entity.relations.supplier).toEqual({
      type: 'belongsTo',
      target: 'Supplier',
      foreignKey: 'supplierId',
    })
    expect(entity.relations.items).toEqual({
      type: 'hasMany',
      target: 'PurchaseOrderItem',
    })
  })

  it('desugars workflow with terminal states', () => {
    expect(entity.workflow).not.toBeNull()
    expect(entity.workflow!.initial).toBe('Draft')
    expect(entity.workflow!.terminal).toContain('Approved')
    expect(entity.workflow!.terminal).toContain('Cancelled')
    expect(entity.workflow!.transitions).toHaveLength(4)
  })

  it('desugars guard.requireParams', () => {
    const rejectTransition = entity.workflow!.transitions.find(t => t.action === 'Reject')
    expect(rejectTransition).toBeDefined()
    expect(rejectTransition!.guard!.requireParams).toContain('rejectReason')
  })

  it('desugars defaultSort with direction', () => {
    expect(entity.views.list).not.toBeNull()
    expect(entity.views.list!.defaultSort).toEqual({ field: 'createdAt', direction: 'DESC' })
  })

  it('desugars tabs layout', () => {
    const detail = entity.views.detail
    expect(detail).not.toBeNull()
    const tabs = detail!.layout.find(l => l.type === 'tabs')
    expect(tabs).toBeDefined()
    if (tabs?.type === 'tabs') {
      expect(tabs.children).toHaveLength(2)
      expect(tabs.children[0].label).toBe('採購明細')
    }
  })

  it('desugars hooks with wildcard event', () => {
    expect(entity.hooks).toHaveLength(2)
    const auditHook = entity.hooks.find(h => h.event === 'after:transition:*')
    expect(auditHook).toBeDefined()
    expect(auditHook!.async).toBe(true)
  })
})
