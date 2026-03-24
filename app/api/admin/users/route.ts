import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/tenant/access";
import { adminUserSchema } from "@/lib/validators/admin-user";
import { hashPassword } from "@/lib/auth/password";
import { adminRepository } from "@/repositories/admin-repository";

export async function POST(request: Request) {
  await requireAdminAccess();
  const payload = await request.json();
  const parsed = adminUserSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await adminRepository.createUser({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
    role: parsed.data.role,
    domainId: parsed.data.role === "CUSTOMER" ? parsed.data.domainId ?? undefined : undefined,
    notificationScenarioId: parsed.data.role === "CUSTOMER" ? parsed.data.notificationScenarioId ?? undefined : undefined
  });

  return NextResponse.json(user, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await requireAdminAccess();
  const payload = (await request.json().catch(() => null)) as { userId?: string } | null;

  if (!payload?.userId) {
    return NextResponse.json({ error: "A userId is required" }, { status: 400 });
  }

  try {
    const deletedUser = await adminRepository.deleteUser({
      userId: payload.userId,
      actingUserId: access.user.id
    });

    return NextResponse.json({
      id: deletedUser.id,
      email: deletedUser.email,
      name: deletedUser.name
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete user" },
      { status: 400 }
    );
  }
}
