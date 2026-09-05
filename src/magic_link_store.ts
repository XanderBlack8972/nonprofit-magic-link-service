import { createHash, randomBytes, randomUUID } from "node:crypto";

export type MemberDashboard = {
  email: string;
  receipt: { receiptId: string; amountCents: number; issuedOn: string };
  reminder: { shift: string; startsAt: string };
  campaign: { name: string; raisedCents: number; donorCount: number };
};

type PendingLink = {
  email: string;
  expiresAt: number;
  used: boolean;
};

export class MagicLinkStore {
  private readonly links = new Map<string, PendingLink>();

  issue(email: string, now: number): { token: string; expiresAt: number } {
    const token = randomBytes(24).toString("base64url");
    const expiresAt = now + 15 * 60 * 1_000;
    this.links.set(this.digest(token), { email, expiresAt, used: false });
    return { token, expiresAt };
  }

  redeem(token: string, now: number): MemberDashboard | null {
    const entry = this.links.get(this.digest(token));
    if (!entry || entry.used || entry.expiresAt <= now) return null;
    entry.used = true;
    return dashboardFor(entry.email);
  }

  private digest(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}

function dashboardFor(email: string): MemberDashboard {
  return {
    email,
    receipt: { receiptId: `rcpt_${randomUUID()}`, amountCents: 7500, issuedOn: "2026-09-03" },
    reminder: { shift: "Community pantry check-in", startsAt: "2026-09-12T09:00:00Z" },
    campaign: { name: "September pantry drive", raisedCents: 284500, donorCount: 41 },
  };
}
