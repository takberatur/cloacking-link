import { z } from 'zod';
import { isValidCustomSlug } from './slug';

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

export const platformSettingsSchema = z
	.object({
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
		enable_register: z.boolean().default(true)
	})
	.catchall(z.any());

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;

// ========================
// Campaigns
// ========================

export const campaignStatuses = ['draft', 'active', 'paused', 'archived'] as const;
export const redirectTypes = ['direct', 'safelink', 'deeplink'] as const;
export const rotationStrategies = ['equal', 'percentage', 'priority'] as const;
export const destinationTypes = ['affiliate', 'cpa', 'direct', 'popunder'] as const;
export const destinationPlatforms = [
	'generic',
	'amazon',
	'ebay',
	'shopee',
	'tiktok',
	'traveloka',
	'custom'
] as const;
export const geoModes = ['all', 'include', 'exclude'] as const;

const httpUrlSchema = z
	.string()
	.url('Enter a valid URL')
	.refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
		message: 'Only HTTP and HTTPS URLs are supported'
	});

const optionalHttpUrlSchema = z
	.union([z.literal(''), httpUrlSchema])
	.transform((value) => value || undefined);

export const campaignDestinationSchema = z
	.object({
		id: z.string().uuid().optional(),
		name: z.string().trim().min(1, 'Destination name is required').max(160),
		url: httpUrlSchema,
		type: z.enum(destinationTypes),
		platform: z.enum(destinationPlatforms),
		enabled: z.boolean().default(true),
		weight: z.coerce.number().int().min(1).max(10000).default(100),
		priority: z.coerce.number().int().min(0).max(10000).default(0),
		geoMode: z.enum(geoModes).default('all'),
		countries: z
			.array(
				z
					.string()
					.trim()
					.regex(/^[a-zA-Z]{2}$/, 'Use ISO two-letter country codes')
					.transform((value) => value.toUpperCase())
			)
			.max(250)
			.default([])
	})
	.superRefine((destination, ctx) => {
		if (destination.geoMode !== 'all' && destination.countries.length === 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['countries'],
				message: 'Add at least one country for include/exclude targeting'
			});
		}
	});

export const campaignSchema = z
	.object({
		name: z.string().trim().min(2, 'Campaign name is required').max(160),
		slug: z
			.string()
			.trim()
			.max(64)
			.refine((value) => value === '' || isValidCustomSlug(value), {
				message:
					'Use 3-64 letters, numbers, hyphens, or underscores; reserved slugs are not allowed'
			}),
		description: z.string().trim().max(1000).default(''),
		status: z.enum(campaignStatuses),
		redirectType: z.enum(redirectTypes),
		rotationStrategy: z.enum(rotationStrategies),
		fallbackUrl: optionalHttpUrlSchema,
		botProtectionEnabled: z.boolean().default(true),
		trackingEnabled: z.boolean().default(true),
		preserveQueryParams: z.boolean().default(true),
		stripReferrer: z.boolean().default(false),
		destinations: z.array(campaignDestinationSchema).min(1, 'Add at least one destination').max(50)
	})
	.superRefine((campaign, ctx) => {
		if (campaign.status === 'active' && !campaign.destinations.some((item) => item.enabled)) {
			ctx.addIssue({
				code: 'custom',
				path: ['destinations'],
				message: 'An active campaign needs at least one enabled destination'
			});
		}

		if (campaign.rotationStrategy === 'percentage') {
			const total = campaign.destinations
				.filter((item) => item.enabled)
				.reduce((sum, item) => sum + item.weight, 0);
			if (total !== 100) {
				ctx.addIssue({
					code: 'custom',
					path: ['destinations'],
					message: `Enabled destination percentages must total 100 (currently ${total})`
				});
			}
		}
	});

export type CampaignInput = z.infer<typeof campaignSchema>;
export type CampaignDestinationInput = z.infer<typeof campaignDestinationSchema>;
