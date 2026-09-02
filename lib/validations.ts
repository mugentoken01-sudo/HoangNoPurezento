import { z } from "zod";

export const pipelineStages = ["lead","contacted","qualified","meeting","credit","approved","disbursed"] as const;
export const customerStatuses = ["active","lost","won"] as const;
export const nextActionTypes = ["call","meeting","email"] as const;
export const taskStatuses = ["todo","doing","done"] as const;
export const taskSources = ["manual","auto_template"] as const;
export const flagSeverities = ["low","medium","high"] as const;

export const customerCreateSchema = z.object({
  company_name: z.string().min(1).max(255),
  industry: z.string().max(120).nullable().optional(),
  revenue_reported: z.number().int().nonnegative().nullable().optional(),
  credit_need_type: z.string().max(60).nullable().optional(),
  credit_need_amount: z.number().int().nonnegative().nullable().optional(),
  credit_need_purpose: z.string().max(500).nullable().optional(),
  current_banks: z.array(z.string().max(60)).optional(),
  stage: z.enum(pipelineStages).optional(),
  status: z.enum(customerStatuses).optional(),
});
export const customerUpdateSchema = customerCreateSchema.partial();

export const stageUpdateSchema = z.object({
  to_stage: z.enum(pipelineStages),
});

export const contactCreateSchema = z.object({
  customer_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  title: z.string().max(120).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(200).nullable().optional().or(z.literal("").transform(() => null)),
  is_primary: z.boolean().optional(),
});
export const contactUpdateSchema = contactCreateSchema.partial().omit({ customer_id: true });

export const noteCreateSchema = z.object({
  customer_id: z.string().uuid(),
  content: z.string().min(1),
  next_action_type: z.enum(nextActionTypes).nullable().optional(),
  next_action_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
export const noteUpdateSchema = z.object({
  content: z.string().min(1).optional(),
  next_action_type: z.enum(nextActionTypes).nullable().optional(),
  next_action_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const taskCreateSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(taskStatuses).optional(),
  source: z.enum(taskSources).optional(),
});
export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(taskStatuses).optional(),
});

export const fsCreateSchema = z.object({
  customer_id: z.string().uuid(),
  period: z.string().min(1).max(20),
  revenue: z.number().int().nullable().optional(),
  cogs: z.number().int().nullable().optional(),
  net_income: z.number().int().nullable().optional(),
  ebit: z.number().int().nullable().optional(),
  ebitda: z.number().int().nullable().optional(),
  interest_expense: z.number().int().nullable().optional(),
  total_assets: z.number().int().nullable().optional(),
  total_liabilities: z.number().int().nullable().optional(),
  total_equity: z.number().int().nullable().optional(),
  current_assets: z.number().int().nullable().optional(),
  current_liabilities: z.number().int().nullable().optional(),
  inventory: z.number().int().nullable().optional(),
  receivables: z.number().int().nullable().optional(),
  payables: z.number().int().nullable().optional(),
  cfo: z.number().int().nullable().optional(),
  total_debt: z.number().int().nullable().optional(),
  cash: z.number().int().nullable().optional(),
});
export const fsUpdateSchema = fsCreateSchema.partial().omit({ customer_id: true, period: true });

export const redFlagCreateSchema = z.object({
  customer_id: z.string().uuid(),
  period: z.string().max(20).nullable().optional(),
  rule_triggered: z.string().min(1).max(80),
  severity: z.enum(flagSeverities),
  description: z.string().min(1),
});
export const redFlagUpdateSchema = z.object({
  severity: z.enum(flagSeverities).optional(),
  description: z.string().min(1).optional(),
  rule_triggered: z.string().min(1).max(80).optional(),
});
