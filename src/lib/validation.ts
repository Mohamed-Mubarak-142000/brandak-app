import { z } from 'zod';

/** Same rules as the API (`brandak backend/src/auth/auth.dto.ts`), with Arabic messages. */

export const EG_MOBILE = /^(?:\+?20|0)?1[0125]\d{8}$/;

export const phoneField = z
  .string()
  .trim()
  .min(1, 'أدخل رقم الموبايل')
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => EG_MOBILE.test(v), 'رقم موبايل مصري غير صحيح (مثال: 01012345678)');

export const emailField = z.string().trim().min(1, 'أدخل البريد الإلكتروني').email('بريد إلكتروني غير صحيح');

export const passwordField = z
  .string()
  .min(8, 'كلمة السر 8 أحرف على الأقل')
  .regex(/[A-Za-z]/, 'لازم تحتوي على حرف إنجليزي واحد على الأقل')
  .regex(/\d/, 'لازم تحتوي على رقم واحد على الأقل');

export const requiredText = (message: string) => z.string().trim().min(1, message);

/** 0–4 strength score for the password meter. */
export function passwordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score++;
  return score;
}

/** Converts Arabic-Indic digits typed on an Arabic keyboard to Latin ones. */
export function latinDigits(value: string) {
  return value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}
