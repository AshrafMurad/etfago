import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import { createAgreement, getAgreementDetail } from "../../src/server/agreements/service";
import {
  inviteParticipant,
  resendInvitation,
  removeParticipant,
  updateParticipantRole,
  getInvitationPreview,
  redeemInvitation,
  listAgreementParticipants,
} from "../../src/server/invitations/service";
import { ConflictError, ForbiddenError, NotFoundError } from "../../src/lib/errors";

describe("Sprint 3 Integration: Invites & Reviewer Roster", () => {
  let organizerUserId: string;
  let organizerWorkspaceId: string;
  let agreementId: string;
  let otherAgreementId: string;

  let aliceUserId: string;
  let charlieUserId: string;
  let davidUserId: string;

  const emailOrganizer = "organizer.roster@example.com";
  const emailAlice = "alice.reviewer@example.com";
  const emailCharlie = "charlie.outsider@example.com";
  const emailDavid = "david.unjoined@example.com";

  beforeAll(async () => {
    // Clean up before test
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [emailOrganizer, emailAlice, emailCharlie, emailDavid],
        },
      },
    });

    // 1. Organizer
    const orgReg = await registerOrGetUser({
      email: emailOrganizer,
      name: "Tariq Organizer",
      locale: "ar",
    });
    organizerUserId = orgReg.user.id;
    organizerWorkspaceId = orgReg.workspaceId;
    await db.user.update({
      where: { id: organizerUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 2. Alice (invitee)
    const aliceReg = await registerOrGetUser({
      email: emailAlice,
      name: "Alice Partner",
      locale: "ar",
    });
    aliceUserId = aliceReg.user.id;

    // 3. Charlie (outsider)
    const charlieReg = await registerOrGetUser({
      email: emailCharlie,
      name: "Charlie Outsider",
      locale: "en",
    });
    charlieUserId = charlieReg.user.id;
    await db.user.update({
      where: { id: charlieUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 4. David
    const davidReg = await registerOrGetUser({
      email: emailDavid,
      name: "David Consultant",
      locale: "ar",
    });
    davidUserId = davidReg.user.id;
    await db.user.update({
      where: { id: davidUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // Create target agreement
    const ag1 = await createAgreement(organizerUserId, {
      workspaceId: organizerWorkspaceId,
      title: "اتفاقية تطوير متجر إلكتروني",
      initialTerms: [{ id: "t1", title: "مرحلة التسليم الأولى" }],
    });
    agreementId = ag1.id;

    // Create a private second agreement in the same workspace (for testing isolation)
    const ag2 = await createAgreement(organizerUserId, {
      workspaceId: organizerWorkspaceId,
      title: "اتفاقية داخلية خاصة بالمنظم فقط",
    });
    otherAgreementId = ag2.id;
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [emailOrganizer, emailAlice, emailCharlie, emailDavid],
        },
      },
    });
  });

  let aliceRawToken = "";
  let aliceParticipantId = "";

  it("1. organizer invites Alice and stores only hashed token; duplicate invitations are rejected", async () => {
    // 1A. Organizer cannot invite themselves
    await expect(
      inviteParticipant(organizerUserId, {
        agreementId,
        email: emailOrganizer,
        partyDisplayName: "المنظم نفسه",
      })
    ).rejects.toThrowError(ConflictError);

    // 1B. Non-organizer (Charlie) cannot invite
    await expect(
      inviteParticipant(charlieUserId, {
        agreementId,
        email: emailAlice,
        partyDisplayName: "محاولة غير مصرح بها",
      })
    ).rejects.toThrowError(ForbiddenError);

    // 1C. Successful invitation to Alice
    const inviteResult = await inviteParticipant(organizerUserId, {
      agreementId,
      email: emailAlice,
      partyDisplayName: "أليس الشريكة",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
      requiredByDefault: true,
    });

    expect(inviteResult.participantId).toBeDefined();
    expect(inviteResult.rawToken).toHaveLength(64);
    aliceRawToken = inviteResult.rawToken;
    aliceParticipantId = inviteResult.participantId;

    // Verify token was stored as SHA-256 hash, NOT plaintext
    const invitationInDb = await db.agreementInvitation.findUnique({
      where: { id: inviteResult.invitationId },
    });
    expect(invitationInDb?.tokenHash).toBeDefined();
    expect(invitationInDb?.tokenHash).not.toBe(inviteResult.rawToken);
    expect(invitationInDb?.status).toBe("PENDING");

    // Verify participant unjoined state
    const participantInDb = await db.agreementParticipant.findUnique({
      where: { id: inviteResult.participantId },
    });
    expect(participantInDb?.userId).toBeNull();
    expect(participantInDb?.joinedAt).toBeNull();
    expect(participantInDb?.requiredByDefault).toBe(true);

    // 1D. Duplicate invitation to same email is rejected
    await expect(
      inviteParticipant(organizerUserId, {
        agreementId,
        email: emailAlice,
        partyDisplayName: "أليس مرة أخرى",
      })
    ).rejects.toThrowError(ConflictError);
  });

  it("2. allows previewing the invitation by token without disclosing private terms", async () => {
    const preview = await getInvitationPreview(aliceRawToken);
    expect(preview.agreementTitle).toBe("اتفاقية تطوير متجر إلكتروني");
    expect(preview.invitedEmail).toBe(emailAlice);
    expect(preview.partyDisplayName).toBe("أليس الشريكة");
    expect(preview.status).toBe("PENDING");
    expect(preview.isExpired).toBe(false);
  });

  it("3. rejects redemption if actor is unverified or has the wrong email address", async () => {
    // 3A. Charlie (wrong email) attempts to redeem Alice's token
    await expect(redeemInvitation(charlieUserId, aliceRawToken)).rejects.toThrowError(
      ForbiddenError
    );

    // 3B. Alice is not yet verified
    const aliceUser = await db.user.findUnique({ where: { id: aliceUserId } });
    expect(aliceUser?.emailVerifiedAt).toBeNull();

    await expect(redeemInvitation(aliceUserId, aliceRawToken)).rejects.toThrowError(
      ForbiddenError
    );
  });

  it("4. Alice verifies email, redeems token, joins agreement, and gains scoped access", async () => {
    // Alice verifies email
    await db.user.update({
      where: { id: aliceUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // Alice redeems token
    const result = await redeemInvitation(aliceUserId, aliceRawToken);
    expect(result.agreementId).toBe(agreementId);
    expect(result.participantId).toBe(aliceParticipantId);

    // Participant record is now linked
    const participant = await db.agreementParticipant.findUnique({
      where: { id: aliceParticipantId },
    });
    expect(participant?.userId).toBe(aliceUserId);
    expect(participant?.joinedAt).not.toBeNull();

    // Alice can now view this agreement
    const detail = await getAgreementDetail(aliceUserId, agreementId);
    expect(detail.id).toBe(agreementId);
    expect(detail.title).toBe("اتفاقية تطوير متجر إلكتروني");

    // Scoped access: Alice CANNOT view the other agreement in organizer's workspace
    await expect(getAgreementDetail(aliceUserId, otherAgreementId)).rejects.toThrowError(
      NotFoundError
    );

    // Re-redemption of consumed token is rejected
    await expect(redeemInvitation(aliceUserId, aliceRawToken)).rejects.toThrowError(
      ConflictError
    );
  });

  it("5. resending an invitation revokes prior tokens and issues a fresh one", async () => {
    // Invite David
    const invite = await inviteParticipant(organizerUserId, {
      agreementId,
      email: emailDavid,
      partyDisplayName: "ديفيد الاستشاري",
    });
    const oldToken = invite.rawToken;

    // Resend
    const resent = await resendInvitation(organizerUserId, agreementId, invite.participantId);
    expect(resent.success).toBe(true);
    expect(resent.rawToken).not.toBe(oldToken);

    // Old token is revoked
    await expect(redeemInvitation(davidUserId, oldToken)).rejects.toThrowError(ConflictError);

    // New token works
    const redeemRes = await redeemInvitation(davidUserId, resent.rawToken);
    expect(redeemRes.participantId).toBe(invite.participantId);
  });

  it("6. participant removal immediately revokes access and outstanding invitations", async () => {
    // Remove David
    const davidParticipant = await db.agreementParticipant.findFirst({
      where: { agreementId, userId: davidUserId },
    });
    expect(davidParticipant).not.toBeNull();

    const removeRes = await removeParticipant(
      organizerUserId,
      agreementId,
      davidParticipant!.id
    );
    expect(removeRes.success).toBe(true);

    // David immediately loses access to agreement
    await expect(getAgreementDetail(davidUserId, agreementId)).rejects.toThrowError(
      NotFoundError
    );

    // Organizer cannot be removed
    const orgParticipant = await db.agreementParticipant.findFirst({
      where: { agreementId, userId: organizerUserId },
    });
    await expect(
      removeParticipant(organizerUserId, agreementId, orgParticipant!.id)
    ).rejects.toThrowError(ForbiddenError);
  });

  it("7. lists participants with their joined and pending status", async () => {
    const list = await listAgreementParticipants(organizerUserId, agreementId);
    expect(list.length).toBeGreaterThanOrEqual(2);

    const organizerEntry = list.find((p) => p.userId === organizerUserId);
    expect(organizerEntry?.status).toBe("JOINED");
    expect(organizerEntry?.agreementRole).toBe("ORGANIZER");

    const aliceEntry = list.find((p) => p.userId === aliceUserId);
    expect(aliceEntry?.status).toBe("JOINED");
    expect(aliceEntry?.agreementRole).toBe("REVIEWER");
  });
});
