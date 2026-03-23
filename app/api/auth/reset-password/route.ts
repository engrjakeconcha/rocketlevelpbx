import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { auditRepository } from "@/repositories/audit-repository";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: parsed.data.token,
      resetTokenExpiresAt: {
        gte: new Date()
      }
    }
  });

  if (!user) {
    return NextResponse.json({ error: "Reset token is invalid or expired" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null
    }
  });

  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });

  if (membership) {
    await auditRepository.create({
      actorId: user.id,
      actorRole: user.role,
      domainId: membership.domainId,
      actionType: "PASSWORD_RESET_COMPLETED",
      objectType: "user",
      objectId: user.id,
      requestId: crypto.randomUUID(),
      message: "Password reset completed"
    });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
