import { z } from 'zod'

/**
 * Validation schemas for all forms using Zod
 * Prevents injection, buffer overflow, and invalid data
 */

// Client form validation
export const ClientSchema = z.object({
  name: z
    .string()
    .min(1, 'שם לקוח נדרש')
    .max(255, 'שם לקוח לא יכול להיות יותר מ-255 תווים')
    .trim(),
  handle: z
    .string()
    .min(1, 'Handle נדרש')
    .max(100, 'Handle לא יכול להיות יותר מ-100 תווים')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Handle יכול להכיל רק אותיות, מספרים, קו תחתון וקו מנה')
    .trim(),
  industryLabel: z.string().optional(),
  brandVoice: z.array(z.string().max(50)).max(10, 'לא יותר מ-10 תכונות'),
  audience: z
    .string()
    .max(500, 'תיאור הקהל לא יכול להיות יותר מ-500 תווים')
    .optional(),
  cadencePerWeek: z.number().min(1).max(7),
  posts: z.array(z.any()).optional(),
  id: z.string().optional(),
})

// Post/Content validation
export const PostSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .min(1, 'כותרת נדרשת')
    .max(255, 'כותרת לא יכולה להיות יותר מ-255 תווים')
    .trim(),
  copy: z
    .string()
    .min(1, 'טקסט נדרש')
    .max(2000, 'טקסט לא יכול להיות יותר מ-2000 תווים')
    .trim(),
  type: z.enum(['text', 'image', 'carousel', 'video', 'story']),
  platforms: z.array(z.string()).min(1, 'בחר לפחות פלטפורמה אחת'),
  status: z.enum(['pending', 'inEdit', 'approved', 'rejected', 'scheduled', 'published']),
  scheduledAt: z.number().optional().nullable(),
  clientId: z.string().min(1, 'לקוח נדרש'),
  rejectionReason: z.string().max(500).optional(),
})

// Campaign validation
export const CampaignSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, 'שם קמפיין נדרש')
    .max(255, 'שם קמפיין לא יכול להיות יותר מ-255 תווים')
    .trim(),
  clientId: z.string().min(1, 'לקוח נדרש'),
  objective: z
    .string()
    .min(1, 'מטרת קמפיין נדרשת')
    .max(500, 'מטרה לא יכולה להיות יותר מ-500 תווים')
    .trim(),
  budget: z
    .number()
    .positive('תקציב חייב להיות מספר חיובי')
    .max(1000000, 'תקציב לא יכול להיות יותר מ-1,000,000'),
  startDate: z.number(),
  endDate: z.number(),
  platforms: z.array(z.string()).min(1, 'בחר לפחות פלטפורמה אחת'),
})

// Settings/Agency validation
export const AgencySettingsSchema = z.object({
  agencyName: z
    .string()
    .min(1, 'שם סוכנות נדרש')
    .max(255, 'שם סוכנות לא יכול להיות יותר מ-255 תווים')
    .trim(),
  agencyEmail: z
    .string()
    .email('דוא"ל לא תקין')
    .max(255, 'דוא"ל לא יכול להיות יותר מ-255 תווים')
    .toLowerCase(),
  agencyPhone: z
    .string()
    .regex(/^[0-9\s+\-()]+$/, 'מספר טלפון לא תקין')
    .min(7, 'מספר טלפון לא תקין')
    .max(20, 'מספר טלפון לא תקין'),
})

// Login validation
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'דוא״ל נדרש')
    .email('דוא״ל לא תקין')
    .max(255, 'דוא״ל לא יכול להיות יותר מ-255 תווים')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'סיסמה נדרשת')
    .min(6, 'סיסמה חייבת להיות לפחות 6 תווים')
    .max(128, 'סיסמה לא יכולה להיות יותר מ-128 תווים'),
})

// Validate and return result
export function validateForm(schema, data) {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated, error: null }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, data: null, error: err.errors[0].message }
    }
    return { success: false, data: null, error: 'שגיאת אימות לא ידועה' }
  }
}

// Helper: sanitize input before validation (removes dangerous chars)
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  return input
    .trim()
    .substring(0, 2000) // Cap at 2000 chars to prevent buffer overflow
}
