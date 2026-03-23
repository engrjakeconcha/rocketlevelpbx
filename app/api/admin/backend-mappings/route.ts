import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/tenant/access";
import { backendMappingSchema } from "@/lib/validators/backend-mapping";
import { adminRepository } from "@/repositories/admin-repository";

export async function GET() {
  await requireAdminAccess();
  const mappings = await adminRepository.listBackendMappings();
  return NextResponse.json(mappings);
}

export async function POST(request: Request) {
  await requireAdminAccess();
  const payload = await request.json();
  const parsed = backendMappingSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mapping = await adminRepository.createBackendMapping(parsed.data);
  return NextResponse.json(mapping, { status: 201 });
}
