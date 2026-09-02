import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const imageUploadSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, 'Max size 5MB.')
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    'Only .jpg, .png, and .webp supported.'
  );
const singleImageSchema = z.instanceof(File).superRefine(async (file, ctx) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    ctx.addIssue({ code: 'custom', message: 'Only .jpg, .png, and .webp supported.' });
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    ctx.addIssue({ code: 'custom', message: 'Max file size 5MB.' });
    return;
  }
  if (typeof window !== 'undefined') {
    const { width, height } = await validateDimensions(file);
    if (width > 1920 || height > 1080) {
      ctx.addIssue({ code: 'custom', message: 'Max image resolution 1920x1080.' });
    }
  }
});
const validateDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve({ width: 0, height: 0 }); // Skip jika di Server
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
  });
};
const fileSchema = z.instanceof(File).superRefine(async (file, ctx) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    ctx.addIssue({ code: 'custom', message: 'Only .jpg, .png, and .webp supported.' });
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    ctx.addIssue({ code: 'custom', message: 'Max size 5MB.' });
    return;
  }

  const { width, height } = await validateDimensions(file);
  if (width > 1920 || height > 1080) {
    ctx.addIssue({ code: 'custom', message: 'Max 1920x1080' });
  }
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().default(false)
});
export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email('Invalid email').min(1),
    password: z.string().min(1),
    confirmPassword: z.string().min(1)
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match',
        path: ['confirmPassword']
      });
      return;
    }
  });
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email').min(1)
});
export const resetPasswordSchema = z
  .object({
    email: z.string().email('Invalid email').min(1),
    otp: z.string().min(6, 'OTP must be 6 digits'),
    password: z.string().min(1),
    confirmPassword: z.string().min(1)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });
export const otpVerificationSchema = z.object({
  email: z.string().email('Invalid email').min(1),
  otp: z.string().min(6, 'OTP must be 6 digits')
});
export const twoFactorSchema = z.object({
  otp: z.string().min(6, 'OTP must be 6 digits'),
  trustDevice: z.boolean().default(false)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OtpVerificationInput = z.infer<typeof otpVerificationSchema>;
export type TwoFactorInput = z.infer<typeof twoFactorSchema>;


// ========================
// Settings Platform
// ========================

export const platformSettingsSchema = z.object({
  site_name: z.string().min(1),
  site_tagline: z.string().min(1),
  site_logo: z.string(),
  site_favicon: z.string(),
  site_meta_title: z.string(),
  site_meta_description: z.string(),
  site_url: z.string().url().min(1),
  site_og_image: z.string(),
  site_og_title: z.string(),
  site_og_description: z.string(),
  site_keywords: z.string(),
  enable_register: z.boolean().default(true),
}).catchall(z.any());

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;