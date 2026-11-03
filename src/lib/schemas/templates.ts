import { z } from "zod";

export const TemplateCategorySchema = z.enum([
  "ALL",
  "PERSONAL",
  "SERVICES",
  "SUPPLY",
  "CONFIDENTIALITY",
]);

export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

export const StarterTemplateTermSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.object({
    ar: z.string().min(1).max(120),
    en: z.string().min(1).max(120),
  }),
  body: z.object({
    ar: z.string().min(1).max(4000),
    en: z.string().min(1).max(4000),
  }),
  amount: z.string().max(32).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  dueDateOffsetDays: z.number().int().min(1).max(365).nullable().optional(),
});

export type StarterTemplateTerm = z.infer<typeof StarterTemplateTermSchema>;

export const StarterTemplateDefinitionSchema = z.object({
  id: z.string().min(1).max(64),
  category: z.enum(["PERSONAL", "SERVICES", "SUPPLY", "CONFIDENTIALITY"]),
  icon: z.string().min(1).max(32),
  title: z.object({
    ar: z.string().min(1).max(160),
    en: z.string().min(1).max(160),
  }),
  description: z.object({
    ar: z.string().min(1).max(4000),
    en: z.string().min(1).max(4000),
  }),
  suggestedRoles: z.object({
    ar: z.array(z.string().min(1).max(64)),
    en: z.array(z.string().min(1).max(64)),
  }),
  terms: z.array(StarterTemplateTermSchema).min(1).max(50),
});

export type StarterTemplateDefinition = z.infer<typeof StarterTemplateDefinitionSchema>;

/**
 * Localized view of a template ready for client UI consumption
 */
export interface LocalizedStarterTemplate {
  id: string;
  category: "PERSONAL" | "SERVICES" | "SUPPLY" | "CONFIDENTIALITY";
  icon: string;
  title: string;
  description: string;
  suggestedRoles: string[];
  termsCount: number;
  terms: Array<{
    id: string;
    title: string;
    body: string | null;
    amount: string | null;
    currency: string | null;
    dueDate: string | null;
  }>;
}

export const CreateFromTemplateSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  templateId: z.string().min(1).max(64),
  customTitle: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(160, "Title cannot exceed 160 characters")
    .optional()
    .nullable(),
});

export type CreateFromTemplateInput = z.infer<typeof CreateFromTemplateSchema>;
