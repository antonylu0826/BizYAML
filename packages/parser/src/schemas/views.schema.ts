import { z } from 'zod'

// ---------------------------------------------------------------------------
// list 視圖
// ---------------------------------------------------------------------------

/**
 * defaultSort：欄位名稱，前綴 `-` 代表降序。
 * 範例：`-createdAt`、`poNumber`
 */
const DefaultSortSchema = z.string().regex(
  /^-?[a-zA-Z][a-zA-Z0-9]*$/,
  '無效的排序格式。範例：createdAt（升序）或 -createdAt（降序）',
)

const ListViewSchema = z.object({
  columns:     z.array(z.string().min(1)).min(1),
  defaultSort: DefaultSortSchema.optional(),
  filterBy:    z.array(z.string().min(1)).optional(),
})
export type ListView = z.infer<typeof ListViewSchema>

// ---------------------------------------------------------------------------
// detail 視圖佈局容器
// ---------------------------------------------------------------------------

/** group 容器：將欄位收納在同一張卡片中 */
const GroupLayoutSchema = z.object({
  type:   z.literal('group'),
  label:  z.string().optional(),
  fields: z.array(z.string().min(1)).min(1),
})

/** tabs 容器的單一分頁 */
const TabItemSchema = z.object({
  label:  z.string(),
  fields: z.array(z.string().min(1)).min(1),
})

/** tabs 容器：水平分頁 */
const TabsLayoutSchema = z.object({
  type:     z.literal('tabs'),
  children: z.array(TabItemSchema).min(1),
})

/** 佈局容器聯集 */
const LayoutItemSchema = z.discriminatedUnion('type', [
  GroupLayoutSchema,
  TabsLayoutSchema,
])
export type LayoutItem = z.infer<typeof LayoutItemSchema>

// ---------------------------------------------------------------------------
// actions 設定
// ---------------------------------------------------------------------------

const ActionsSchema = z.object({
  placement: z.enum(['top', 'bottom', 'both']).optional().default('top'),
  include:   z.array(z.string().min(1)).optional(),
})

// ---------------------------------------------------------------------------
// detail 視圖
// ---------------------------------------------------------------------------

const DetailViewSchema = z.object({
  actions: ActionsSchema.optional(),
  layout:  z.array(LayoutItemSchema).min(1),
})
export type DetailView = z.infer<typeof DetailViewSchema>

// ---------------------------------------------------------------------------
// views 根節點
// ---------------------------------------------------------------------------

export const ViewsSchema = z.object({
  list:   ListViewSchema.optional(),
  detail: DetailViewSchema.optional(),
})
export type Views = z.infer<typeof ViewsSchema>

// ---------------------------------------------------------------------------
// .views.yaml 根 schema
// ---------------------------------------------------------------------------

export const ViewsFileSchema = z.object({
  name:  z.string().min(1),
  label: z.string().optional(),
  views: ViewsSchema,
})
export type ViewsFile = z.infer<typeof ViewsFileSchema>
