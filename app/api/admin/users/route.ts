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
