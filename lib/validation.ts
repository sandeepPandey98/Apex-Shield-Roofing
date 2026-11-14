import { z } from "zod";
export const leadSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d .-]{10,25}$/),
  address: z.string().trim().min(5).max(250),
  zipCode: z.string().regex(/^\d{5}$/),
  serviceType: z.enum(["Inspection", "Repair", "Replacement"]),
  notes: z.string().trim().max(2000).default(""),
  consent: z.literal(true),
  website: z.string().max(0).default(""),
});
export const paymentSchema = z.object({
  serviceId: z.string(),
  confirmationToken: z.string().regex(/^ctok_[A-Za-z0-9]+$/),
  email: z.email(),
  saveCardConsent: z.boolean().default(false),
});
export const invoiceSchema = z
  .object({
    customerEmail: z.email(),
    requestedAt: z.iso.datetime(),
    totalJobAmount: z.number().finite().positive().max(1000000),
    depositPaid: z.number().finite().nonnegative().max(1000000).default(500),
    description: z.string().trim().min(3).max(500),
    chargeStoredCard: z.boolean().default(false),
    memberId: z
      .string()
      .regex(/^mber_[A-Za-z0-9]+$/)
      .optional(),
    paymentMethodId: z
      .string()
      .regex(/^payt_[A-Za-z0-9]+$/)
      .optional(),
    authorizationConfirmed: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (Math.round(v.totalJobAmount * 100) <= Math.round(v.depositPaid * 100))
      ctx.addIssue({
        code: "custom",
        message: "Project total must exceed deposit.",
      });
    if (
      v.chargeStoredCard &&
      (!v.memberId || !v.paymentMethodId || !v.authorizationConfirmed)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Saved-card billing requires a member, payment method, and confirmed authorization.",
      });
  });
export function balanceCents(total: number, deposit: number) {
  return Math.round(total * 100) - Math.round(deposit * 100);
}

export const depositSetupSchema = z.object({
  paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  verificationToken: z.string().min(32).max(2048),
});
export const depositSetupVerificationSchema = depositSetupSchema.extend({
  setupIntentId: z.string().regex(/^sint_[A-Za-z0-9]+$/),
});
