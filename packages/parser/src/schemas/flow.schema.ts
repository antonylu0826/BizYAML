import { z } from 'zod'
import { ExprSchema } from './common.js'

// ---------------------------------------------------------------------------
// validations (shared in root level & guard)
// ---------------------------------------------------------------------------

export const ValidationRuleSchema = z.object({
  rule:    ExprSchema,
  message: z.string().optional(),
})
export type ValidationRule = z.infer<typeof ValidationRuleSchema>

export const ValidationsSchema = z.array(ValidationRuleSchema)

// ---------------------------------------------------------------------------
// workflow
// ---------------------------------------------------------------------------

/** guard container (specific to workflow.transitions) */
export const GuardSchema = z.object({
  validations:   ValidationsSchema.optional(),
  requireParams: z.array(z.string().min(1)).optional(),
})
export type Guard = z.infer<typeof GuardSchema>

/** Single state transition rule */
export const TransitionSchema = z.object({
  action:      z.string().min(1),
  label:       z.string().optional(),
  description: z.string().optional(),
  from:        z.array(z.string().min(1)).min(1),
  to:          z.string().min(1),
  guard:       GuardSchema.optional(),
})
export type Transition = z.infer<typeof TransitionSchema>

/** workflow root node */
export const WorkflowSchema = z.object({
  statusField: z.string().min(1),
  initial:     z.string().min(1),
  terminal:    z.array(z.string().min(1)).optional(),
  transitions: z.array(TransitionSchema),
})
export type Workflow = z.infer<typeof WorkflowSchema>

// ---------------------------------------------------------------------------
// hooks
// ---------------------------------------------------------------------------

/**
 * Supported event formats:
 *   after:transition:Submit
 *   before:transition:*
 *   after:create
 *   after:update
 */
const HookEventSchema = z.string().regex(
  /^(before|after):(transition:[A-Za-z*]+|create|update)$/,
  'Invalid event format. Example: after:transition:Submit, before:transition:*, after:create',
)

const RetrySchema = z.object({
  attempts: z.number().int().positive(),
  backoff:  z.enum(['fixed', 'exponential']),
})

export const HookSchema = z.object({
  event:   HookEventSchema,
  type:    z.literal('webhook'),
  url:     z.string().url(),
  method:  z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().default('POST'),
  async:   z.boolean().optional().default(false),
  headers: z.record(z.string(), z.string()).optional(),
  payload: z.record(z.string(), z.string()).optional(),
  retry:   RetrySchema.optional(),
})
export type Hook = z.infer<typeof HookSchema>

export const HooksSchema = z.array(HookSchema)

// ---------------------------------------------------------------------------
// .flow.yaml root schema
// ---------------------------------------------------------------------------

export const FlowFileSchema = z.object({
  name:        z.string().min(1),
  label:       z.string().optional(),
  validations: ValidationsSchema.optional(),
  workflow:    WorkflowSchema.optional(),
  hooks:       HooksSchema.optional(),
})
export type FlowFile = z.infer<typeof FlowFileSchema>
