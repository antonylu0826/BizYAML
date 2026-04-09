import { z } from 'zod'

// ---------------------------------------------------------------------------
// list view
// ---------------------------------------------------------------------------

/**
 * defaultSort: field name, prefix `-` represents descending order.
 * Example: `-createdAt`, `poNumber`
 */
const DefaultSortSchema = z.string().regex(
  /^-?[a-zA-Z][a-zA-Z0-9]*$/,
  'Invalid sort format. Example: createdAt (ascending) or -createdAt (descending)',
)

const ListViewSchema = z.object({
  columns:     z.array(z.string().min(1)).min(1),
  defaultSort: DefaultSortSchema.optional(),
  filterBy:    z.array(z.string().min(1)).optional(),
})
export type ListView = z.infer<typeof ListViewSchema>

// ---------------------------------------------------------------------------
// detail view layout container
// ---------------------------------------------------------------------------

/** group container: groups fields into the same card */
const GroupLayoutSchema = z.object({
  type:   z.literal('group'),
  label:  z.string().optional(),
  fields: z.array(z.string().min(1)).min(1),
})

/** Single tab in tabs container */
const TabItemSchema = z.object({
  label:  z.string(),
  fields: z.array(z.string().min(1)).min(1),
})

/** tabs container: horizontal tabs */
const TabsLayoutSchema = z.object({
  type:     z.literal('tabs'),
  children: z.array(TabItemSchema).min(1),
})

/** Layout container union */
const LayoutItemSchema = z.discriminatedUnion('type', [
  GroupLayoutSchema,
  TabsLayoutSchema,
])
export type LayoutItem = z.infer<typeof LayoutItemSchema>

// ---------------------------------------------------------------------------
// actions configuration
// ---------------------------------------------------------------------------

const ActionsSchema = z.object({
  placement: z.enum(['top', 'bottom', 'both']).optional().default('top'),
  include:   z.array(z.string().min(1)).optional(),
})

// ---------------------------------------------------------------------------
// detail view
// ---------------------------------------------------------------------------

const DetailViewSchema = z.object({
  actions: ActionsSchema.optional(),
  layout:  z.array(LayoutItemSchema).min(1),
})
export type DetailView = z.infer<typeof DetailViewSchema>

// ---------------------------------------------------------------------------
// views root node
// ---------------------------------------------------------------------------

export const ViewsSchema = z.object({
  list:   ListViewSchema.optional(),
  detail: DetailViewSchema.optional(),
})
export type Views = z.infer<typeof ViewsSchema>

// ---------------------------------------------------------------------------
// .views.yaml root schema
// ---------------------------------------------------------------------------

export const ViewsFileSchema = z.object({
  name:  z.string().min(1),
  label: z.string().optional(),
  views: ViewsSchema,
})
export type ViewsFile = z.infer<typeof ViewsFileSchema>
