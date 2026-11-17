import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(200);
export const passwordSchema = z.string().min(8).max(128);

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  cityId: z.string().optional().or(z.literal("")),
  locale: z.enum(["ar", "en"]).default("ar"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema, locale: z.enum(["ar", "en"]).optional() });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  cityId: z.string().nullable().optional(),
  locale: z.enum(["ar", "en"]).optional(),
});

export const createOrderSchema = z.object({
  eventId: z.string().min(1),
  items: z
    .array(z.object({ ticketTypeId: z.string().min(1), quantity: z.number().int().min(1).max(50) }))
    .min(1)
    .max(20),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const pushTokenSchema = z.object({ token: z.string().min(10).max(300) });

export const eventListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  cityId: z.string().optional(),
  categoryId: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  minPrice: z.coerce.number().min(0).optional(), // SAR
  maxPrice: z.coerce.number().min(0).optional(), // SAR
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
  featured: z.enum(["1", "0"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
