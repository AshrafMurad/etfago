import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { EtfagoPrismaAdapter } from "./adapter";
import { db } from "../db/prisma";
import { verifyEmailToken } from "./service";
import { z } from "zod";
import { consumeAuthRateLimit } from "./rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: EtfagoPrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/ar/auth/signin",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials, request) {
        const parsed = z.object({
          email: z.string().trim().email().max(255),
          token: z.string().regex(/^[a-f0-9]{64}$/),
        }).safeParse(credentials);
        if (!parsed.success) return null;
        try {
          const allowed = await consumeAuthRateLimit(
            "verify-ip", request.headers.get("x-real-ip") || "unknown", 30, 900000
          );
          if (!allowed) return null;
          const result = await verifyEmailToken(parsed.data);
          return {
            id: result.user.id,
            email: result.user.emailNormalized,
            emailVerified: result.user.emailVerifiedAt,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.authVersion = 2;
        token.email = user.email;
        token.name = user.name;
        token.emailVerified = (user as unknown as { emailVerified?: Date | null }).emailVerified ?? null;
      }

      // Never merge client-supplied session fields into the signed identity.
      if (token.authVersion !== 2) return null;
      // If token still has no emailVerified, check DB once to see if user has verified their email
      if (!token.emailVerified && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { emailVerifiedAt: true },
        });
        if (dbUser?.emailVerifiedAt) {
          token.emailVerified = dbUser.emailVerifiedAt;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        // Pass verified status to client session
        (session.user as unknown as { emailVerified?: Date | null }).emailVerified =
          (token.emailVerified as Date | null) ?? null;
      }
      return session;
    },
  },
});
