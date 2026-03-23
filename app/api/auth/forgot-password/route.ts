import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { prisma } from "@/lib/db/prisma";
import { authRateLimiter } from "@/lib/auth/rate-limit";
import { auditRepository } from "@/repositories/audit-repository";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rate = authRateLimiter.check(`forgot-password:${ip}`);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many reset requests" }, { status: 429 });
  }

  const formData = await request.formData();
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const token = crypto.randomUUID() + crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 30)
      }
    });

    const membership = await prisma.membership.findFirst({ where: { userId: user.id } });

    if (membership) {
      await auditRepository.create({
        actorId: user.id,
        actorRole: user.role,
        domainId: membership.domainId,
        actionType: "PASSWORD_RESET_REQUESTED",
        objectType: "user",
        objectId: user.id,
        requestId: crypto.randomUUID(),
        message: "Password reset requested"
      });
    }
  }

  return NextResponse.json({ message: "If the account exists, a reset email will be sent." });
}
