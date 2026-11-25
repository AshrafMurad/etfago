import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { EtfagoPrismaAdapter } from "./adapter";
import { db } from "../db/prisma";
import { normalizeEmail } from "../../lib/email";
import { registerOrGetUser } from "./service";

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
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.email !== "string") {
          return null;
        }

        const emailNormalized = normalizeEmail(credentials.email);
        const name = typeof credentials.name === "string" ? credentials.name : undefined;

        // Register or retrieve user and ensure personal workspace is created
        const result = await registerOrGetUser({
          email: emailNormalized,
          name,
        });

        return {
          id: result.user.id,
          name: result.user.name,
          email: result.user.emailNormalized,
          emailVerified: result.user.emailVerifiedAt,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.emailVerified = (user as unknown as { emailVerified?: Date | null }).emailVerified ?? null;
      }

      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

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
