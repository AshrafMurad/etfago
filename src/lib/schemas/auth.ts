import { z } from "zod";
import { normalizeEmail } from "../email";

export const RegisterInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255)
    .transform((val) => normalizeEmail(val)),
  locale: z.enum(["ar", "en"]).default("ar"),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const SignInInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255)
    .transform((val) => normalizeEmail(val)),
});

export type SignInInput = z.infer<typeof SignInInputSchema>;

const PasswordSchema = z.string().min(12, "Password must be at least 12 characters").max(128);

export const PasswordSignInInputSchema = SignInInputSchema.extend({
  password: PasswordSchema,
});

export const PasswordRegisterInputSchema = RegisterInputSchema.extend({
  password: PasswordSchema,
});

export type PasswordSignInInput = z.infer<typeof PasswordSignInInputSchema>;
export type PasswordRegisterInput = z.infer<typeof PasswordRegisterInputSchema>;

export const VerifyEmailInputSchema = z.object({
  token: z.string().min(10, "Invalid verification token"),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;
