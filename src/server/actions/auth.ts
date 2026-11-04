"use server";

import { RegisterInputSchema, SignInInputSchema } from "../../lib/schemas/auth";
import { registerOrGetUser, requestVerificationEmail } from "../auth/service";
import { signOut } from "../auth/auth";

export type ActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
  data?: Record<string, unknown>;
};

export async function registerAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    locale: (formData.get("locale") as string) || "ar",
  };

  const parsed = RegisterInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid input data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await registerOrGetUser({
      email: parsed.data.email,
      name: parsed.data.name,
      locale: parsed.data.locale,
    });

    return {
      success: true,
      message: result.isNewUser
        ? "Account created. A verification link has been sent to your email."
        : "Welcome back. If not yet verified, a new verification link was sent.",
      data: {
        userId: result.user.id,
        email: result.user.emailNormalized,
        isNewUser: result.isNewUser,
        verified: !!result.user.emailVerifiedAt,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to register";
    return {
      success: false,
      error: message,
    };
  }
}

export async function requestVerificationAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawEmail = formData.get("email") as string;
  const locale = (formData.get("locale") as string) || "ar";

  const parsed = SignInInputSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid email address",
    };
  }

  try {
    const res = await requestVerificationEmail(parsed.data.email, locale);
    if (res.alreadyVerified) {
      return {
        success: true,
        message: "Email is already verified. You can sign in.",
      };
    }
    return {
      success: true,
      message: "A fresh verification link has been sent to your email address.",
    };
  } catch {
    return {
      success: false,
      error: "Could not send verification email. Please try again.",
    };
  }
}

export async function signOutAction(formDataOrLocale?: FormData | string): Promise<void> {
  let locale = "ar";
  if (typeof formDataOrLocale === "string") {
    locale = formDataOrLocale;
  } else if (formDataOrLocale instanceof FormData) {
    locale = (formDataOrLocale.get("locale") as string) || "ar";
  }
  await signOut({ redirectTo: `/${locale}/auth/signin` });
}
