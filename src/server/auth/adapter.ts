import type { PrismaClient } from "@prisma/client";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";
import { normalizeEmail } from "../../lib/email";

function mapUserToAdapterUser(user: {
  id: string;
  name: string | null;
  emailNormalized: string;
  emailVerifiedAt: Date | null;
  locale: string;
}): AdapterUser {
  return {
    id: user.id,
    name: user.name,
    email: user.emailNormalized,
    emailVerified: user.emailVerifiedAt,
    image: null,
  };
}

export function EtfagoPrismaAdapter(p: PrismaClient): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const emailNorm = normalizeEmail(data.email);

      // Atomically create user and their default personal workspace
      const result = await p.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: data.name ?? null,
            emailNormalized: emailNorm,
            emailVerifiedAt: data.emailVerified ?? null,
            locale: "ar",
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            kind: "PERSONAL",
            name: "مساحتي الشخصية",
            ownerUserId: user.id,
          },
        });

        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "OWNER",
          },
        });

        return user;
      });

      return mapUserToAdapterUser(result);
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const user = await p.user.findUnique({ where: { id } });
      return user ? mapUserToAdapterUser(user) : null;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const emailNorm = normalizeEmail(email);
      const user = await p.user.findUnique({ where: { emailNormalized: emailNorm } });
      return user ? mapUserToAdapterUser(user) : null;
    },

    async getUserByAccount(provider_providerAccountId: {
      provider: string;
      providerAccountId: string;
    }): Promise<AdapterUser | null> {
      const account = await p.account.findUnique({
        where: { provider_providerAccountId },
        include: { user: true },
      });
      return account?.user ? mapUserToAdapterUser(account.user) : null;
    },

    async updateUser(data: Partial<AdapterUser> & { id: string }): Promise<AdapterUser> {
      const updateData: {
        name?: string | null;
        emailNormalized?: string;
        emailVerifiedAt?: Date | null;
      } = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.email) updateData.emailNormalized = normalizeEmail(data.email);
      if (data.emailVerified !== undefined) updateData.emailVerifiedAt = data.emailVerified;

      const user = await p.user.update({
        where: { id: data.id },
        data: updateData,
      });

      return mapUserToAdapterUser(user);
    },

    async deleteUser(id: string): Promise<void> {
      await p.user.delete({ where: { id } });
    },

    async linkAccount(data: AdapterAccount): Promise<AdapterAccount> {
      await p.account.create({
        data: {
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token,
          access_token: data.access_token,
          expires_at: data.expires_at,
          token_type: data.token_type,
          scope: data.scope,
          id_token: data.id_token,
          session_state: (data.session_state as string) ?? null,
        },
      });
      return data;
    },

    async unlinkAccount(provider_providerAccountId: {
      provider: string;
      providerAccountId: string;
    }): Promise<void> {
      await p.account.delete({ where: { provider_providerAccountId } });
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const sessionWithUser = await p.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!sessionWithUser) return null;

      const { user, ...session } = sessionWithUser;
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
        user: mapUserToAdapterUser(user),
      };
    },

    async createSession(data: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      const session = await p.session.create({
        data: {
          sessionToken: data.sessionToken,
          userId: data.userId,
          expires: data.expires,
        },
      });
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      };
    },

    async updateSession(data: Partial<AdapterSession> & { sessionToken: string }): Promise<AdapterSession | null> {
      const session = await p.session.update({
        where: { sessionToken: data.sessionToken },
        data: {
          ...(data.expires ? { expires: data.expires } : {}),
          ...(data.userId ? { userId: data.userId } : {}),
        },
      });
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      };
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await p.session.delete({ where: { sessionToken } });
    },

    async createVerificationToken(data: VerificationToken): Promise<VerificationToken> {
      const token = await p.verificationToken.create({
        data: {
          identifier: normalizeEmail(data.identifier),
          token: data.token,
          expires: data.expires,
        },
      });
      return {
        identifier: token.identifier,
        token: token.token,
        expires: token.expires,
      };
    },

    async useVerificationToken(params: { identifier: string; token: string }): Promise<VerificationToken | null> {
      try {
        const token = await p.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: normalizeEmail(params.identifier),
              token: params.token,
            },
          },
        });
        return {
          identifier: token.identifier,
          token: token.token,
          expires: token.expires,
        };
      } catch {
        return null;
      }
    },
  };
}
